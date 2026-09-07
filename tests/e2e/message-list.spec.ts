import { test, expect, type Page } from '@playwright/test'
import {
  launchElectron,
  closeElectron,
  getScrollableOffset,
  scrollListTo,
  type LaunchedApp,
} from './launch'

let launched: LaunchedApp
let page: Page

test.beforeAll(async () => {
  launched = await launchElectron()
  page = launched.page
})

test.afterAll(async () => {
  await closeElectron(launched)
})

async function resetApp(): Promise<void> {
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByTestId('chat.message-list')).toBeVisible()
  await page.waitForTimeout(400)
}

test.describe('US1: follow the conversation from the bottom', () => {
  test('a new message is visible without scrolling while at the bottom', async () => {
    await resetApp()
    const beforeCount = await page.getByTestId(/^chat\.message\./).count()
    await page.getByTestId('demo.append').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    const afterCount = await page.getByTestId(/^chat\.message\./).count()
    expect(afterCount).toBeGreaterThan(beforeCount)
    const offset = await getScrollableOffset(page)
    expect(offset).toBeGreaterThanOrEqual(0)
  })

  test('a streaming message keeps the same identity and position across updates', async () => {
    await resetApp()
    await page.getByTestId('demo.append').click()
    const lastId = await page
      .locator('[data-testid^="chat.message."]')
      .last()
      .getAttribute('data-testid')
    expect(lastId).toBeTruthy()
    const beforeOffset = await getScrollableOffset(page)
    const beforeText = await page.getByTestId(lastId!).textContent()
    await page.getByTestId('demo.stream').click()
    await page.getByTestId('demo.stream').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    const sameRow = page.getByTestId(lastId!)
    await expect(sameRow).toBeVisible()
    const afterText = await sameRow.textContent()
    expect(afterText).not.toBe(beforeText)
    const afterOffset = await getScrollableOffset(page)
    expect(Math.abs(afterOffset - beforeOffset)).toBeLessThan(200)
  })
})

test.describe('US2: read earlier content without disruption', () => {
  test('scrolled up, new messages do not move the viewport and an unread count appears', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    await page.getByTestId('demo.append').click()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')

    await scrollListTo(page, 200)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('scrolled-up')

    const offsetBefore = await getScrollableOffset(page)
    await page.getByTestId('demo.append').click()
    await page.getByTestId('demo.append').click()
    await expect(page.getByTestId('demo.unread')).toHaveText('unread: 2')

    const offsetAfter = await getScrollableOffset(page)
    expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(50)
    expect(offsetBefore).toBeGreaterThan(0)
  })

  test('activating scroll-to-latest returns to the newest message and clears the unread count', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    await page.getByTestId('demo.append').click()
    await page.waitForTimeout(500)

    await scrollListTo(page, 300)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('scrolled-up')
    await page.getByTestId('demo.append').click()
    await expect(page.getByTestId('demo.unread')).toHaveText('unread: 1')

    await page.getByTestId('chat.scroll-to-latest').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    await expect(page.getByTestId('demo.unread')).toHaveText('unread: 0')
    await expect(page.getByTestId('chat.scroll-to-latest')).toHaveCount(0)
  })
})

test.describe('US3: load earlier messages', () => {
  test('loading earlier messages appends above the viewport without moving it', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    await page.getByTestId('demo.append').click()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')

    await scrollListTo(page, 300)
    await page.waitForTimeout(200)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('scrolled-up')

    const offsetBefore = await getScrollableOffset(page)

    await page.getByTestId('demo.load-earlier').click()
    await page.waitForTimeout(500)

    const offsetAfter = await getScrollableOffset(page)
    // Loading earlier messages must not move the visible anchor.
    expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(80)
  })

  test('the load-earlier control disappears when no earlier messages remain', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('chat.load-earlier')).toHaveCount(0)
  })
})

test.describe('SC-001: long-conversation responsiveness', () => {
  test('renders 1,000 messages and scrolls without stalling', async () => {
    await resetApp()
    const start = Date.now()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.locator('[data-testid^="chat.message."]').first()).toBeVisible({
      timeout: 10_000,
    })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(10_000)

    const scrollHeight = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="chat.message-list"]')
      if (!root) return 0
      const sc = Array.from(root.querySelectorAll('div')).filter((d) => {
        const s = getComputedStyle(d)
        return s.overflowY === 'auto' || s.overflowY === 'scroll'
      })
      return sc.reduce((max, el) => Math.max(max, el.scrollHeight), 0)
    })
    // A 1,000-message conversation overflows the viewport and is scrollable.
    expect(scrollHeight).toBeGreaterThan(1000)
  })
})
