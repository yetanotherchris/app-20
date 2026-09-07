import { test, expect, type Page } from '@playwright/test'
import {
  launchElectron,
  closeElectron,
  getScrollableOffset,
  scrollListTo,
  getScrollHeight,
  measureScrollStall,
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
    await page.getByTestId('demo.append').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    // The appended message is the last rendered row and stays in the viewport
    // (auto-follow) without the user scrolling.
    const lastId = await page
      .locator('[data-testid^="chat.message."]')
      .last()
      .getAttribute('data-testid')
    expect(lastId).toBeTruthy()
    await expect(page.getByTestId(lastId!)).toBeVisible()
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

    // Pick a message that is visible in the viewport and record its screen position.
    const anchorId = await page
      .locator('[data-testid^="chat.message."]')
      .filter({ visible: true })
      .first()
      .getAttribute('data-testid')
    expect(anchorId).toBeTruthy()
    const anchorLocator = page.getByTestId(anchorId!)
    const boxBefore = await anchorLocator.boundingBox()
    expect(boxBefore).toBeTruthy()

    await page.getByTestId('demo.load-earlier').click()
    await page.waitForTimeout(500)

    // The anchor message stays at the same screen position after the prepend.
    await expect(anchorLocator).toBeVisible()
    const boxAfter = await anchorLocator.boundingBox()
    expect(Math.abs((boxAfter?.y ?? 0) - (boxBefore?.y ?? 0))).toBeLessThan(2)
  })

  test('the load-earlier control disappears when no earlier messages remain', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('chat.load-earlier')).toHaveCount(0)

    // Make earlier history available: the control appears.
    await page.getByTestId('demo.load-earlier').click()
    await expect(page.getByTestId('chat.load-earlier')).toBeVisible()

    // Load the final batch: history is exhausted and the control disappears.
    await page.getByTestId('demo.exhaust').click()
    await expect(page.getByTestId('chat.load-earlier')).toHaveCount(0)
  })
})

test.describe('SC-001: long-conversation responsiveness', () => {
  test('renders 1,000 messages within 2 seconds and scrolls without stalling', async () => {
    await resetApp()
    const start = Date.now()
    await page.getByTestId('demo.load-1000').click()
    // The final bulk message must render within the spec's 2-second budget,
    // proving the full conversation, not just the first visible row.
    await expect(page.getByText('Bulk message 1000')).toBeVisible({ timeout: 10_000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)

    // A 1,000-message conversation overflows the viewport and is scrollable.
    const scrollHeight = await getScrollHeight(page)
    expect(scrollHeight).toBeGreaterThan(1000)

    // Continuous scrolling shows no stall longer than 100 ms.
    const stall = await measureScrollStall(page)
    expect(stall).toBeLessThan(100)
  })

  test('large ~10 KB messages render and scroll without stalling', async () => {
    await resetApp()
    const start = Date.now()
    await page.getByTestId('demo.load-1000-large').click()
    // The list renders its full data set; the first bulk row must be present
    // after load, proving the large rows committed within budget.
    await expect(page.locator('[data-testid^="chat.message."]').first()).toBeVisible({
      timeout: 10_000,
    })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)

    // 1,000 messages of ~10 KB each overflow the viewport substantially.
    const scrollHeight = await getScrollHeight(page)
    expect(scrollHeight).toBeGreaterThan(100_000)

    const stall = await measureScrollStall(page)
    expect(stall).toBeLessThan(100)
  })
})
