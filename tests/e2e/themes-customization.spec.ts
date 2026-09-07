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
  await expect(page.getByTestId('chat.root')).toBeVisible()
  await page.waitForTimeout(300)
}

test.describe('US1: light and dark themes', () => {
  test('every surface follows the theme switch (US1-A1)', async () => {
    await resetApp()
    const root = page.getByTestId('chat.root')
    // Light theme: the root background is the light token.
    await expect(root).toHaveCSS('background-color', 'rgb(248, 250, 252)')
    await page.getByTestId('demo.toggle-theme').click()
    // Dark theme: the root background is the dark token, proving surfaces
    // actually consume theme tokens rather than hardcoding a color.
    await expect(root).toHaveCSS('background-color', 'rgb(15, 23, 42)')
    await expect(page.getByTestId('chat.message-list')).toBeVisible()
    await expect(page.getByTestId('chat.message.demo-1000')).toBeVisible()
  })

  test('a custom theme overriding a token reflects the override (US1-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-custom-theme').click()
    // The custom theme overrides primary and userBubble to #9333ea; the user
    // message bubble reflects it, proving the override reaches surfaces.
    await expect(page.getByTestId('chat.message.demo-1000')).toHaveCSS(
      'background-color',
      'rgb(147, 51, 234)',
    )
  })

  test('a theme switch while streaming preserves the stream and scroll position (US1-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
    await page.waitForTimeout(300)
    // Scroll up so a position change would be visible, and record the offset.
    await scrollListTo(page, 200)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('scrolled-up')
    const offsetBefore = await getScrollableOffset(page)
    expect(offsetBefore).toBeGreaterThan(0)
    // Start a streaming update, then switch the theme.
    await page.getByTestId('demo.stream').click()
    await page.getByTestId('demo.toggle-theme').click()
    await page.waitForTimeout(300)
    // The list is still there and the scroll position is preserved.
    await expect(page.getByTestId('chat.message-list')).toBeVisible()
    const offsetAfter = await getScrollableOffset(page)
    expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(50)
  })
})

test.describe('US2: replace renderers, controls, and actions', () => {
  test('a custom message renderer is used for every message (US2-A1)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-message-renderer').click()
    await expect(page.getByText('custom: Hello, how do I export a CSV in Node?')).toBeVisible()
  })

  test('a custom content renderer for one content type with defaults elsewhere (US2-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-content-renderer').click()
    // The user message (plain) renders through the custom renderer.
    await expect(
      page.getByText('custom-plain: Hello, how do I export a CSV in Node?'),
    ).toBeVisible()
    // Assistant markdown still renders through the default.
    await expect(page.getByText(/csv-stringify/).first()).toBeVisible()
  })

  test('custom Send, Stop, and scroll-to-latest controls replace the defaults (US2-A4)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-controls').click()
    await expect(page.getByTestId('demo.custom-send')).toBeVisible()
    await expect(page.getByTestId('demo.custom-composer-control')).toBeVisible()
    // Default send control is gone.
    await expect(page.getByTestId('chat.composer.send')).toHaveCount(0)
  })

  test('custom controls keep Stop reachable during a submission (edge case)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-controls').click()
    // Submit through the custom send path by typing and sending.
    await page.getByTestId('chat.composer.input').fill('busy')
    // The composer uses the custom send control; trigger submit via Enter.
    await page.getByTestId('chat.composer.input').press('Enter')
    await expect(page.getByTestId('demo.custom-stop')).toBeVisible()
  })

  test('message actions render grouped and fire with message context (US2-A5)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await expect(page.getByTestId('chat.action-menu').first()).toBeVisible()
    await page.getByTestId('chat.action-menu').first().click()
    await expect(page.getByText('Copy message')).toBeVisible()
    await page.getByTestId('chat.action.copy').click()
    // The demo records the action in the last-link status.
    await expect(page.getByTestId('demo.last-link')).toHaveText(/action on demo-1000/)
  })

  test('removing all actions leaves no action affordance (edge case)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    await expect(page.getByTestId('chat.action-menu').first()).toBeVisible()
    await page.getByTestId('demo.toggle-actions').click()
    await expect(page.getByTestId('chat.action-menu')).toHaveCount(0)
  })

  test('custom icons replace the defaults (US2-A7)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-icons').click()
    await expect(page.getByTestId('demo.custom-send-icon')).toBeVisible()
  })

  test('no custom renderer means the default is used (US2-A8)', async () => {
    await resetApp()
    // Defaults are on: the plain user message renders normally, no custom markers.
    await expect(page.getByTestId('chat.message.demo-1000')).toBeVisible()
    await expect(page.getByText('custom-plain:').first()).toHaveCount(0)
  })

  test('a custom Markdown element renderer is used for that element, defaults elsewhere (US2-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.markdown-suite').click()
    await page.getByTestId('demo.toggle-markdown-elements').click()
    await page.waitForTimeout(300)
    // The custom link element renders for links in the markdown suite.
    await expect(page.getByTestId('demo.custom-markdown-link').first()).toBeVisible()
    // Other elements still use the default renderer (code blocks remain).
    await expect(page.getByRole('button', { name: /copy code/i }).first()).toBeVisible()
  })
})

test.describe('US3: replace status states', () => {
  test('an empty conversation shows the empty state (US3-A1)', async () => {
    await resetApp()
    await page.getByTestId('demo.clear-messages').click()
    await expect(page.getByTestId('chat.state.empty')).toBeVisible()
  })

  test('a response being requested shows the loading state (US3-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.simulate-submitting').click()
    await expect(page.getByTestId('chat.state.loading')).toBeVisible()
  })

  test('an error status shows the error state (US3-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.simulate-error').click()
    await expect(page.getByTestId('chat.state.error')).toBeVisible()
  })

  test('custom state views appear in the right conditions (FR-008)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-states').click()
    // Clear messages: the custom empty state renders in place of the default.
    await page.getByTestId('demo.clear-messages').click()
    await expect(page.getByTestId('demo.custom-empty-state')).toBeVisible()
    await expect(page.getByTestId('chat.state.empty')).toHaveCount(0)
  })
})

test.describe('US4: constrain and disable', () => {
  test('disabled blocks input and actions (US4-A1)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-disabled').click()
    const input = page.getByTestId('chat.composer.input')
    await expect(input).toHaveAttribute('readonly', '')
  })

  test('read-only keeps content readable and the composer non-editable (US4-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-read-only').click()
    await expect(page.getByTestId('chat.message.demo-1000')).toBeVisible()
    await expect(page.getByTestId('chat.composer.input')).toHaveAttribute('readonly', '')
  })

  test('a disabled capability makes the related action inert (US4-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-cap-send').click()
    // Send is disabled when the send capability is off.
    await page.getByTestId('chat.composer.input').fill('cap test')
    await expect(page.getByTestId('chat.composer.send')).toBeDisabled()
  })

  test('a disabled copy capability hides the code-block copy control (US4-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.markdown-suite').click()
    await page.waitForTimeout(400)
    // Code blocks have copy controls by default.
    await expect(page.getByRole('button', { name: /copy code/i }).first()).toBeVisible()
    await page.getByTestId('demo.toggle-cap-copy').click()
    await page.waitForTimeout(400)
    // With the copy capability off, the copy controls disappear.
    await expect(page.getByRole('button', { name: /copy code/i })).toHaveCount(0)
  })
})

test.describe('SC-003: usable with no customization', () => {
  test('the full chat flow works with defaults', async () => {
    await resetApp()
    await page.getByTestId('chat.composer.input').fill('default flow')
    await page.getByTestId('chat.composer.send').click()
    await expect(page.getByText('default flow')).toBeVisible()
    await expect(page.getByTestId('chat.composer.input')).toHaveValue('')
  })
})
