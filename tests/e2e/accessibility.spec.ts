import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
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

async function outlineStyle(testID: string): Promise<string> {
  return page.getByTestId(testID).evaluate((el) => getComputedStyle(el).outlineStyle)
}

test.describe('US1: keyboard operation with visible focus', () => {
  test('focus order is logical and every control shows a visible focus ring (US1-A1/A2)', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await input.focus()
    await expect(input).toBeFocused()
    // The composer input shows a visible focus indicator.
    expect(await outlineStyle('chat.composer.input')).not.toBe('none')
    // A non-empty draft enables Send so it is a tab stop.
    await page.keyboard.type('focus ring')
    await input.focus()
    // Tab reaches the Send control next.
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('chat.composer.send')).toBeFocused()
    expect(await outlineStyle('chat.composer.send')).not.toBe('none')
    // The ring is a visible stroke, not a zero-width artifact.
    const width = await page
      .getByTestId('chat.composer.send')
      .evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))
    expect(width).toBeGreaterThan(0)
  })

  test('the full chat flow works with the keyboard alone (US1-A2)', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await input.focus()
    await page.keyboard.type('keyboard send')
    await page.keyboard.press('Enter')
    await expect(page.getByText('keyboard send')).toBeVisible()
    // Wait for the demo reply so its timer cannot race the next step.
    await expect(page.getByText(/Reply to: keyboard send/)).toBeVisible()
    await page.getByTestId('demo.simulate-streaming').click()
    await expect(page.getByTestId('chat.composer.stop')).toBeVisible()
    // Reach Stop with the keyboard and activate it.
    await input.focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('chat.composer.stop')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('chat.message-status.stopped')).toBeVisible()
  })

  test('standard scroll keys operate the message list from a focused row (US1-A3)', async () => {
    await resetApp()
    await page.getByTestId('demo.load-1000').click()
    await page.waitForTimeout(400)
    await scrollListTo(page, 200)
    await page.waitForTimeout(200)
    const row = page.locator('[data-testid^="chat.message."]').first()
    await row.focus()
    await expect(row).toBeFocused()
    const before = await getScrollableOffset(page)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(200)
    const after = await getScrollableOffset(page)
    expect(after).toBeGreaterThan(before)
    // The list still renders rows after the scroll.
    expect(await page.locator('[data-testid^="chat.message."]').count()).toBeGreaterThan(0)
  })
})

test.describe('US2: reflow at 200% zoom', () => {
  test('no horizontal clipping and content stays visible at 200% zoom (US2-A1/A2)', async () => {
    await resetApp()
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    await page.waitForTimeout(200)
    const metrics = await page.getByTestId('chat.root').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
    await expect(page.getByTestId('chat.message.demo-1001')).toBeVisible()
    await expect(page.getByTestId('chat.composer.input')).toBeVisible()
    await page.evaluate(() => {
      document.documentElement.style.zoom = ''
    })
  })
})

test.describe('US3: status without color', () => {
  test('streaming and error states stay identifiable with color removed (US3-A1/A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.simulate-streaming').click()
    await expect(page.getByTestId('chat.message-status.streaming')).toBeVisible()
    await expect(page.getByTestId('chat.status.streaming')).toBeVisible()
    await expect(page.getByText('Streaming', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Streaming…')).toBeVisible()
    // Remove color: the labels must still be present.
    await page.evaluate(() => {
      document.body.style.filter = 'grayscale(100%)'
    })
    await expect(page.getByTestId('chat.message-status.streaming')).toBeVisible()
    await expect(page.getByText('Streaming', { exact: true }).first()).toBeVisible()
    await page.evaluate(() => {
      document.body.style.filter = ''
    })
    // A message-level error badge renders without replacing the list.
    await page.getByTestId('demo.mark-error').click()
    await expect(page.getByTestId('chat.message-status.error')).toBeVisible()
    await expect(page.getByText('Error').first()).toBeVisible()
    // The chat-level error status is announced as text, not color.
    await page.getByTestId('demo.simulate-error').click()
    await expect(page.getByTestId('chat.status.error')).toBeVisible()
    await expect(page.getByText('Error').first()).toBeVisible()
  })
})

test.describe('US4: reduced motion and high contrast', () => {
  test('no component animation plays with reduced motion (US4-A1)', async () => {
    await resetApp()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByTestId('chat.root')).toBeVisible()
    // The action menu opens without a fade.
    await page.getByTestId('demo.toggle-actions').click()
    await page.getByTestId('chat.action-menu').first().click()
    await expect(page.getByText('Copy message')).toBeVisible()
    const menuAnimated = await page.getByText('Copy message').evaluate((el) => {
      let node = el as HTMLElement | null
      while (node) {
        const style = getComputedStyle(node)
        if (style.animationName && style.animationName !== 'none') return true
        node = node.parentElement
      }
      return false
    })
    expect(menuAnimated).toBe(false)
    // Dismiss the menu so its modal backdrop does not block later clicks.
    await page.getByText('Copy message').click()
    await expect(page.getByText('Copy message')).toHaveCount(0)
    // Loading surface under reduced motion renders a static glyph, no spinner.
    await page.getByTestId('demo.clear-messages').click()
    await page.getByTestId('demo.simulate-submitting').click()
    await expect(page.getByTestId('chat.state.loading')).toBeVisible()
    const animated = await page.getByTestId('chat.state.loading').evaluate((el) => {
      for (const node of el.querySelectorAll('*')) {
        const style = getComputedStyle(node)
        if (style.animationName && style.animationName !== 'none') return true
      }
      return false
    })
    expect(animated).toBe(false)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  test('high contrast swaps the palette and stays readable, including dark (US4-A2)', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-high-contrast').click()
    await expect(page.getByTestId('chat.root')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    // Dark + high contrast: black surface, white user bubble.
    await page.getByTestId('demo.toggle-theme').click()
    await expect(page.getByTestId('chat.root')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(page.getByTestId('chat.message.demo-1000')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    )
  })
})

test.describe('edge cases', () => {
  test('focus moves to a nearby message when the focused message is removed', async () => {
    await resetApp()
    // Default fixture has demo-1000..demo-1003; focus the last and remove it.
    const last = page.getByTestId('chat.message.demo-1003')
    await last.focus()
    await expect(last).toBeFocused()
    // Trigger the removal without moving focus (a real click would move focus
    // to the demo button before the message is removed).
    await page.getByTestId('demo.remove-last-message').evaluate((el) => {
      const target = el as HTMLElement
      const rect = target.getBoundingClientRect()
      const options = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        button: 0,
      }
      target.dispatchEvent(new MouseEvent('mousedown', options))
      target.dispatchEvent(new MouseEvent('mouseup', options))
      target.dispatchEvent(new MouseEvent('click', options))
    })
    await expect(page.getByTestId('chat.message.demo-1003')).toHaveCount(0)
    // Focus lands on the nearest remaining row (same index, clamped).
    await expect(page.getByTestId('chat.message.demo-1002')).toBeFocused()
  })

  test('controls meet the 24px minimum target on web (FR-004)', async () => {
    await resetApp()
    const sendBox = await page.getByTestId('chat.composer.send').boundingBox()
    expect(sendBox).not.toBeNull()
    expect(sendBox!.height).toBeGreaterThanOrEqual(24)
    expect(sendBox!.width).toBeGreaterThanOrEqual(24)
    // Scroll-to-latest appears only once the user scrolls up.
    await page.getByTestId('demo.load-1000').click()
    await page.waitForTimeout(400)
    await scrollListTo(page, 200)
    await expect(page.getByTestId('chat.scroll-to-latest')).toBeVisible()
    const scrollBox = await page.getByTestId('chat.scroll-to-latest').boundingBox()
    expect(scrollBox).not.toBeNull()
    expect(scrollBox!.height).toBeGreaterThanOrEqual(24)
    expect(scrollBox!.width).toBeGreaterThanOrEqual(24)
  })
})

test.describe('SC-001: automated WCAG 2.2 AA scan', () => {
  test('the built chat passes the axe WCAG 2.2 AA scan', async () => {
    await resetApp()
    await page.getByTestId('demo.markdown-suite').click()
    await page.waitForTimeout(400)
    const results = await new AxeBuilder({ page })
      .include('[data-testid="chat.root"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      // Electron pages cannot create the helper page AxeBuilder's partial
      // runner needs, so legacy mode runs axe.run directly in the app frame.
      .setLegacyMode()
      .analyze()
    // scrollable-region-focusable is a false positive here: message rows are
    // the keyboard anchors and the US1-A3 test proves the scroll keys operate
    // the list from a focused row (research R5), so the scroll container is
    // intentionally not a tab stop.
    const failures = results.violations.filter(
      (violation) => violation.id !== 'scrollable-region-focusable',
    )
    expect(failures).toEqual([])
  })
})
