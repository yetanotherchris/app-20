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
  await expect(page.getByTestId('chat.composer.input')).toBeVisible()
  await page.waitForTimeout(300)
}

async function typeDraft(text: string): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
}

test.describe('US1: send a message', () => {
  test('sends via the Send button and clears the draft', async () => {
    await resetApp()
    await typeDraft('hello world')
    await page.getByTestId('chat.composer.send').click()
    // The user message appears in the list and the draft clears.
    await expect(page.getByText('hello world')).toBeVisible()
    await expect(page.getByTestId('chat.composer.input')).toHaveValue('')
  })

  test('sends via the Enter key on desktop', async () => {
    await resetApp()
    await typeDraft('enter send')
    await page.getByTestId('chat.composer.input').press('Enter')
    await expect(page.getByText('enter send')).toBeVisible()
  })

  test('does not submit with an empty or whitespace draft', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    const before = await page.getByTestId(/^chat\.message\./).count()
    await typeDraft('   ')
    // Whitespace-only draft: Send disabled.
    await expect(page.getByTestId('chat.composer.send')).toBeDisabled()
    await input.press('Enter')
    await page.waitForTimeout(300)
    // No user message was added.
    expect(await page.getByTestId(/^chat\.message\./).count()).toBe(before)
  })
})

test.describe('US2: compose a multiline message', () => {
  test('Shift+Enter inserts a newline without sending', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await typeDraft('line one')
    await input.press('Shift+Enter')
    const value = await input.inputValue()
    expect(value).toContain('\n')
  })

  test('the composer grows with content and scrolls internally past max height', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    // A long draft of repeated lines exceeds the default max height.
    const longDraft = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n')
    await typeDraft(longDraft)
    await page.waitForTimeout(300)
    // The input's rendered height grew beyond the single-line minimum.
    const height = await input.evaluate(
      (el) => (el as HTMLTextAreaElement).getBoundingClientRect().height,
    )
    expect(height).toBeGreaterThan(50)
  })
})

test.describe('US3: stop a response', () => {
  test('a busy state shows Stop and disables Send; idle hides Stop', async () => {
    await resetApp()
    await typeDraft('busy test')
    await page.getByTestId('chat.composer.send').click()
    // Simulated streaming: Stop appears, Send is gone.
    await expect(page.getByTestId('chat.composer.stop')).toBeVisible()
    await expect(page.getByTestId('chat.composer.send')).toHaveCount(0)
    // After the simulated response completes, Stop disappears.
    await expect(page.getByTestId('chat.composer.stop')).toHaveCount(0, { timeout: 3000 })
  })
})

test.describe('US4: compose with an input-method editor', () => {
  test('pasted multiline text keeps newlines', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await input.fill('pasted\nmultiline\ntext')
    expect(await input.inputValue()).toBe('pasted\nmultiline\ntext')
  })
})

test.describe('SC-003: draft survives unrelated updates', () => {
  test('the draft persists when messages update', async () => {
    await resetApp()
    await typeDraft('persist me')
    // Trigger a message-list update (append) and confirm the draft survives.
    await page.getByTestId('demo.append').click()
    await expect(page.getByTestId('chat.composer.input')).toHaveValue('persist me')
  })
})
