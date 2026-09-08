import { test, expect, type Page } from '@playwright/test'
import { launchElectron, closeElectron, type LaunchedApp } from './launch'

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
  await expect(page.getByTestId('chat.root')).toBeVisible()
  await page.waitForTimeout(300)
}

async function submit(prompt: string): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(prompt)
  await page.getByTestId('chat.composer.send').click()
}

function lastMessage(): ReturnType<Page['locator']> {
  return page.locator('[data-testid^="chat.message."]').last()
}

test.describe('US1: watch a response stream in', () => {
  test('chunks appear incrementally and the status moves to complete (US1-A1/A3)', async () => {
    await resetApp()
    await submit('stream me')
    await expect(page.getByTestId('chat.message-status.sending').last()).toBeVisible()
    await page.getByTestId('demo.stream-chunk').click()
    await expect(page.getByTestId('chat.message-status.streaming').last()).toBeVisible()
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.stream-chunk').click()
    await expect(lastMessage()).toContainText('chunk chunk chunk')
    await page.getByTestId('demo.complete-stream').click()
    await expect(page.getByTestId('chat.message-status.streaming')).toHaveCount(0)
    await expect(page.getByTestId('chat.message-status.sending')).toHaveCount(0)
  })

  test('partial Markdown renders without breaking the layout (US1-A2)', async () => {
    await resetApp()
    await submit('markdown')
    await page.getByTestId('demo.stream-markdown').click()
    await expect(lastMessage()).toContainText('const answer = 42')
    const metrics = await page.getByTestId('chat.root').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  })

  test('typing continues while a response streams (US1-A4, FR-011)', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await input.fill('first draft')
    await page.getByTestId('chat.composer.send').click()
    await page.getByTestId('demo.stream-chunk').click()
    // The draft is independent of the streaming updates.
    await input.fill('typing continues')
    await expect(input).toHaveValue('typing continues')
    await page.getByTestId('demo.stream-chunk').click()
    await expect(input).toHaveValue('typing continues')
  })
})

test.describe('US2: stop a response mid-stream', () => {
  test('stop before the first chunk retains the empty response (US2-A1)', async () => {
    await resetApp()
    await submit('stop early')
    await page.getByTestId('chat.composer.stop').click()
    await expect(page.getByTestId('chat.message-status.stopped').last()).toBeVisible()
  })

  test('stop mid-stream retains the partial content (US2-A1)', async () => {
    await resetApp()
    await submit('stop mid')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('chat.composer.stop').click()
    await expect(page.getByTestId('chat.message-status.stopped').last()).toBeVisible()
    await expect(lastMessage()).toContainText('chunk chunk')
  })

  test('stop wins the final-chunk race and later completion is ignored (US2-A2)', async () => {
    await resetApp()
    await submit('race')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('chat.composer.stop').click()
    await page.getByTestId('demo.complete-stream').click()
    await expect(page.getByTestId('chat.message-status.stopped').last()).toBeVisible()
    await expect(page.getByTestId('chat.message-status.complete')).toHaveCount(0)
  })
})

test.describe('US3: retry and regenerate', () => {
  test('retry a failed response replaces it in place (US3-A1)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await submit('retry me')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.fail-stream').click()
    await expect(page.getByTestId('chat.message-status.error').last()).toBeVisible()

    const failedRow = lastMessage()
    const failedRowId = await failedRow.getAttribute('data-testid')
    await failedRow.locator('[data-testid="chat.action-menu"]').click()
    await page.getByTestId('chat.action.retry').click()

    // Replaced in place: same row id, sending again, empty content.
    await expect(page.getByTestId(failedRowId!)).toHaveCount(1)
    await expect(page.getByTestId('chat.message-status.sending').last()).toBeVisible()
    await page.getByTestId('demo.stream-chunk').click()
    await expect(page.getByTestId(failedRowId!)).toContainText('chunk')
    await page.getByTestId('demo.complete-stream').click()
    await expect(page.getByTestId('chat.message-status.error')).toHaveCount(0)
  })

  test('regenerate a completed response replaces it in place (US3-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await submit('regenerate me')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.complete-stream').click()
    await expect(page.getByTestId('chat.message-status.streaming')).toHaveCount(0)

    const completedRow = lastMessage()
    const completedRowId = await completedRow.getAttribute('data-testid')
    await completedRow.locator('[data-testid="chat.action-menu"]').click()
    await page.getByTestId('chat.action.regenerate').click()

    await expect(page.getByTestId(completedRowId!)).toHaveCount(1)
    await expect(page.getByTestId('chat.message-status.sending').last()).toBeVisible()
    await page.getByTestId('demo.stream-chunk').click()
    await expect(page.getByTestId(completedRowId!)).toContainText('chunk')
  })

  test('a late update from a superseded operation is ignored (US3-A3, FR-005)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await submit('stale')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.complete-stream').click()

    const completedRowId = await lastMessage().getAttribute('data-testid')
    await lastMessage().locator('[data-testid="chat.action-menu"]').click()
    await page.getByTestId('chat.action.regenerate').click()

    // The superseded operation's controls are held by demo.stale-chunk.
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.stale-chunk').click()
    await expect(page.getByTestId(completedRowId!)).toContainText('chunk')
    await expect(page.getByTestId(completedRowId!)).not.toContainText('STALE')
  })
})

test.describe('US4: copy a message', () => {
  test('copying a message delegates its text to the host (US4-A1)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await submit('copy me')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.complete-stream').click()
    await lastMessage().locator('[data-testid="chat.action-menu"]').click()
    await page.getByTestId('chat.action.copy').click()
    await expect(page.getByTestId('demo.copied-text')).toContainText('chunk chunk')
  })

  test('copying a code block uses the code-copy path (US4-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.markdown-suite').click()
    await page.waitForTimeout(400)
    const copyButtons = page.getByRole('button', { name: /copy code/i })
    await copyButtons.first().click()
    await expect(page.getByText('Copied').first()).toBeVisible()
  })
})

test.describe('edge cases', () => {
  test('duplicate sends never fire while a response is in flight (FR-008)', async () => {
    await resetApp()
    await submit('first')
    const countBefore = await page.locator('[data-testid^="chat.message."]').count()
    // Press Enter again while the response is sending.
    await page.getByTestId('chat.composer.input').fill('second')
    await page.keyboard.press('Enter')
    const countAfter = await page.locator('[data-testid^="chat.message."]').count()
    expect(countAfter).toBe(countBefore)
  })

  test('replacing the conversation during streaming leaks no updates', async () => {
    await resetApp()
    await submit('streaming')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.replace-conversation').click()
    await expect(page.getByTestId('chat.message-list')).toBeVisible()
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.stream-chunk').click()
    // Only the single replacement message remains.
    await expect(page.locator('[data-testid^="chat.message."]')).toHaveCount(1)
  })

  test('a dropped connection leaves an errored response with partial content and retry', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await submit('drop')
    await page.getByTestId('demo.stream-chunk').click()
    await page.getByTestId('demo.fail-stream').click()
    await expect(page.getByTestId('chat.message-status.error').last()).toBeVisible()
    await expect(lastMessage()).toContainText('chunk')
    // Retry is available on the errored response.
    await lastMessage().locator('[data-testid="chat.action-menu"]').click()
    await expect(page.getByTestId('chat.action.retry')).toBeVisible()
  })
})
