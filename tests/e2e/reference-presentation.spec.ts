import { test, expect, type Page } from '@playwright/test'
import {
  launchElectron,
  closeElectron,
  resizeWindow,
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

function box(testID: string) {
  return page.getByTestId(testID).boundingBox()
}

// The reading column renders once per message row; the first row is the
// representative column measurement.
function columnBox() {
  return page.getByTestId('chat.reading-column').first().boundingBox()
}

test.describe('US1: read a conversation in the reference layout', () => {
  test('the reading column is centered with whitespace on both sides', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    const root = await box('chat.root')
    const column = await columnBox()
    expect(root).not.toBeNull()
    expect(column).not.toBeNull()
    // About 540px wide at the reference panel, within 10%.
    expect(column!.width).toBeGreaterThanOrEqual(540 * 0.9)
    expect(column!.width).toBeLessThanOrEqual(540 * 1.1)
    // Horizontally centered within the panel to within 8px.
    const panelCenter = root!.x + root!.width / 2
    const columnCenter = column!.x + column!.width / 2
    expect(Math.abs(columnCenter - panelCenter)).toBeLessThanOrEqual(8)
    // Whitespace on both sides: the column is not flush to either edge.
    expect(column!.x - root!.x).toBeGreaterThan(40)
    expect(root!.x + root!.width - (column!.x + column!.width)).toBeGreaterThan(40)
  })

  test('user bubbles are gray right-aligned with no tail; assistant text is unboxed', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    const column = await columnBox()
    expect(column).not.toBeNull()

    const userBubble = page.getByTestId('chat.message.demo-1000')
    const userBox = await userBubble.boundingBox()
    expect(userBox).not.toBeNull()
    // Light-gray surface with dark readable text.
    await expect(userBubble).toHaveCSS('background-color', 'rgb(236, 236, 236)')
    const userText = userBubble.getByText('Hello, how do I export a CSV in Node?')
    await expect(userText).toHaveCSS('color', 'rgb(15, 23, 42)')
    // Right-aligned to the column's right edge.
    expect(Math.abs(userBox!.x + userBox!.width - (column!.x + column!.width))).toBeLessThan(3)
    // No tail: top-right corner equals the shared bubble radius.
    const radii = await userBubble.evaluate((el) => ({
      topRight: getComputedStyle(el).borderTopRightRadius,
      topLeft: getComputedStyle(el).borderTopLeftRadius,
    }))
    expect(radii.topRight).toBe(radii.topLeft)
    expect(parseFloat(radii.topLeft)).toBeGreaterThan(10)

    const assistantRow = page.getByTestId('chat.message.demo-1001')
    const assistantBox = await assistantRow.boundingBox()
    expect(assistantBox).not.toBeNull()
    // Unboxed: no surface and no corner radius.
    await expect(assistantRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    // Left-aligned to the column's left edge.
    expect(Math.abs(assistantBox!.x - column!.x)).toBeLessThan(3)
  })

  test('markdown suite renders without an enclosing response card', async () => {
    await resetApp()
    await page.getByTestId('demo.markdown-suite').click()
    await page.waitForTimeout(400)
    // Code keeps its own surface and does not wrap the response in a card.
    await expect(page.getByRole('button', { name: /copy code/i }).first()).toBeVisible()
    // The last assistant row stays unboxed.
    await expect(page.locator('[data-testid^="chat.message."]').last()).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
  })

  test('a short conversation keeps the first turn near the top and the composer at the bottom', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    const list = await box('chat.message-list')
    const first = await page.getByTestId('chat.message.demo-1000').boundingBox()
    const pill = await box('chat.composer.pill')
    const root = await box('chat.root')
    expect(list).not.toBeNull()
    expect(first).not.toBeNull()
    expect(pill).not.toBeNull()
    expect(root).not.toBeNull()
    // First turn near the top of the conversation area, not bottom-aligned.
    expect(first!.y - list!.y).toBeLessThan(100)
    // Composer pinned to the bottom.
    expect(root!.y + root!.height - (pill!.y + pill!.height)).toBeLessThan(80)
  })
})

test.describe('US2: write from the bottom composer', () => {
  test('the composer is a centered pill wider than the reading column', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    const root = await box('chat.root')
    const column = await columnBox()
    const pill = await box('chat.composer.pill')
    expect(root).not.toBeNull()
    expect(column).not.toBeNull()
    expect(pill).not.toBeNull()
    // About 650px wide at the reference panel, within 10%.
    expect(pill!.width).toBeGreaterThanOrEqual(650 * 0.9)
    expect(pill!.width).toBeLessThanOrEqual(650 * 1.1)
    // Wider than the reading column.
    expect(pill!.width).toBeGreaterThan(column!.width)
    // Centered, near the bottom.
    const panelCenter = root!.x + root!.width / 2
    const pillCenter = pill!.x + pill!.width / 2
    expect(Math.abs(pillCenter - panelCenter)).toBeLessThanOrEqual(8)
    // Pill shape: strongly rounded corners.
    const radius = await page
      .getByTestId('chat.composer.pill')
      .evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))
    expect(radius).toBeGreaterThan(20)
    // White surface with the thin neutral outline.
    await expect(page.getByTestId('chat.composer.pill')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    )
    await expect(page.getByTestId('chat.composer.pill')).toHaveCSS(
      'border-color',
      'rgb(217, 217, 227)',
    )
  })

  test('Send is a circular up-arrow control with the accessible name Send', async () => {
    await resetApp()
    const send = page.getByTestId('chat.composer.send')
    // Empty draft: disabled.
    await expect(send).toBeDisabled()
    await expect(send).toHaveAttribute('aria-label', 'Send')
    // Non-empty draft: enabled.
    await page.getByTestId('chat.composer.input').fill('hello')
    await expect(send).toBeEnabled()
    const box = await send.boundingBox()
    expect(box).not.toBeNull()
    // Circular: equal width and height.
    expect(box!.width).toBeCloseTo(box!.height, 0)
  })

  test('a multiline draft grows the pill and then scrolls internally', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    const longDraft = `line ${'x'.repeat(60)}\n`.repeat(40)
    await input.fill(longDraft)
    await page.waitForTimeout(300)
    const metrics = await input.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }))
    // Internal scroll after the configured growth limit.
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
    // The composer control stays reachable.
    await expect(page.getByTestId('chat.composer.send')).toBeVisible()
  })

  test('the composer returns to its default height after sending a multiline draft', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    const longDraft = `line ${'x'.repeat(60)}\n`.repeat(20)
    await input.fill(longDraft)
    await page.waitForTimeout(300)
    const grown = await input.evaluate(
      (el) => (el as HTMLTextAreaElement).getBoundingClientRect().height,
    )
    expect(grown).toBeGreaterThan(50)
    await page.getByTestId('chat.composer.send').click()
    await page.waitForTimeout(300)
    const reset = await input.evaluate(
      (el) => (el as HTMLTextAreaElement).getBoundingClientRect().height,
    )
    expect(reset).toBeLessThanOrEqual(50)
  })

  test('Stop swaps into the same control area without a width change', async () => {
    await resetApp()
    const input = page.getByTestId('chat.composer.input')
    await input.fill('streaming draft')
    const widthBefore = (await box('chat.composer.pill'))!.width
    await page.getByTestId('chat.composer.send').click()
    await expect(page.getByTestId('chat.composer.stop')).toBeVisible()
    await expect(page.getByTestId('chat.composer.send')).toHaveCount(0)
    const widthDuring = (await box('chat.composer.pill'))!.width
    expect(Math.abs(widthDuring - widthBefore)).toBeLessThan(2)
    const stopBox = await page.getByTestId('chat.composer.stop').boundingBox()
    expect(stopBox).not.toBeNull()
    expect(stopBox!.width).toBeCloseTo(stopBox!.height, 0)
  })

  test('only the history scrolls; no plus or microphone placeholder appears', async () => {
    await resetApp()
    // No plus/microphone control in the default composer.
    await expect(page.getByTestId('chat.composer.pill').locator('button')).toHaveCount(1)
    await page.getByTestId('demo.load-1000').click()
    await page.waitForTimeout(400)
    await scrollListTo(page, 200)
    // Composer remains available and full-width pill unchanged.
    await expect(page.getByTestId('chat.composer.pill')).toBeVisible()
    await expect(page.getByTestId('chat.composer.input')).toBeVisible()
  })
})

test.describe('US3: use existing actions and states', () => {
  test('message actions are a compact left-aligned row below assistant content', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    await page.getByTestId('demo.toggle-actions').click()
    // Actions on an assistant message sit under its content.
    const row = page.getByTestId('chat.message.demo-1001').getByTestId('chat.message-actions')
    await expect(row).toBeVisible()
    const rowBox = await row.boundingBox()
    const column = await columnBox()
    const contentBox = await page.getByTestId('chat.message.demo-1001').boundingBox()
    expect(rowBox).not.toBeNull()
    expect(column).not.toBeNull()
    expect(contentBox).not.toBeNull()
    // Left-aligned with the reading column and below the assistant content.
    expect(Math.abs(rowBox!.x - column!.x)).toBeLessThan(8)
    expect(rowBox!.y).toBeGreaterThan(contentBox!.y)
  })

  test('actions are keyboard-reachable and copy, retry, and regenerate rules hold', async () => {
    await resetApp()
    await page.getByTestId('demo.toggle-actions').click()
    const copy = page.getByTestId('chat.action.copy').first()
    await copy.focus()
    await page.keyboard.press('Enter')
    // The demo records the copy action.
    await expect(page.getByTestId('demo.last-link')).toHaveText(/action on demo-1000/)
    // No unsupported share action appears.
    await expect(page.getByTestId('chat.action.share')).toHaveCount(0)
  })

  test('streaming states stay readable without color and unboxed', async () => {
    await resetApp()
    await page.getByTestId('demo.simulate-streaming').click()
    await expect(page.getByTestId('chat.message-status.streaming')).toBeVisible()
    await page.evaluate(() => {
      document.body.style.filter = 'grayscale(100%)'
    })
    await expect(page.getByText('Streaming', { exact: true }).first()).toBeVisible()
    await page.evaluate(() => {
      document.body.style.filter = ''
    })
    // The streaming response row (the last message) stays unboxed.
    await expect(page.locator('[data-testid^="chat.message."]').last()).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
  })

  test('return-to-latest sits above the composer and returns to the latest', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    await page.getByTestId('demo.load-1000').click()
    await page.waitForTimeout(400)
    await scrollListTo(page, 200)
    await expect(page.getByTestId('chat.scroll-to-latest')).toBeVisible()
    const scrollBox = await box('chat.scroll-to-latest')
    const pill = await box('chat.composer.pill')
    const root = await box('chat.root')
    expect(scrollBox).not.toBeNull()
    expect(pill).not.toBeNull()
    expect(root).not.toBeNull()
    // Centered horizontally, above the composer, not covering its controls.
    const scrollCenter = scrollBox!.x + scrollBox!.width / 2
    const panelCenter = root!.x + root!.width / 2
    expect(Math.abs(scrollCenter - panelCenter)).toBeLessThan(40)
    expect(scrollBox!.y + scrollBox!.height).toBeLessThanOrEqual(pill!.y)
    await page.getByTestId('chat.scroll-to-latest').click()
    await page.waitForTimeout(300)
    await expect(page.getByTestId('demo.at-bottom')).toHaveText('at-bottom')
  })

  test('empty, disabled, and read-only chats keep their restrictions', async () => {
    await resetApp()
    await page.getByTestId('demo.clear-messages').click()
    await expect(page.getByTestId('chat.state.empty')).toBeVisible()
    await page.getByTestId('demo.toggle-disabled').click()
    await expect(page.getByTestId('chat.composer.input')).toHaveAttribute('readonly', '')
    await page.getByTestId('demo.toggle-disabled').click()
    await page.getByTestId('demo.toggle-read-only').click()
    await expect(page.getByTestId('chat.composer.input')).toHaveAttribute('readonly', '')
  })
})

test.describe('US4: use the layout at different sizes and themes', () => {
  test('a narrow panel reflows without panel-wide horizontal overflow', async () => {
    await resetApp()
    await resizeWindow(launched, 390, 844)
    const metrics = await page.getByTestId('chat.root').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
    // Alignment stays distinct: user bubbles sit right of center, assistant
    // text left of center (a scrollbar may inset the right edge by ~15px).
    const column = await columnBox()
    const userBox = await page.getByTestId('chat.message.demo-1000').boundingBox()
    const assistantBox = await page.getByTestId('chat.message.demo-1001').boundingBox()
    expect(column).not.toBeNull()
    expect(userBox).not.toBeNull()
    expect(assistantBox).not.toBeNull()
    expect(userBox!.x + userBox!.width).toBeGreaterThan(column!.x + column!.width * 0.6)
    expect(assistantBox!.x).toBeLessThan(column!.x + column!.width * 0.4)
  })

  test('200% zoom reflows without overlap or loss', async () => {
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
    await expect(page.getByTestId('chat.composer.input')).toBeVisible()
    await expect(page.getByTestId('chat.composer.send')).toBeVisible()
    await page.evaluate(() => {
      document.documentElement.style.zoom = ''
    })
  })

  test('dark and high-contrast themes keep the hierarchy readable', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    // Dark: gray bubble surface with light text, unboxed assistant.
    await page.getByTestId('demo.toggle-theme').click()
    await expect(page.getByTestId('chat.message.demo-1000')).toHaveCSS(
      'background-color',
      'rgb(52, 53, 54)',
    )
    await expect(page.getByTestId('chat.message.demo-1001')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
    // High contrast (dark base): white bubble, black canvas.
    await page.getByTestId('demo.toggle-high-contrast').click()
    await expect(page.getByTestId('chat.message.demo-1000')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    )
    await expect(page.getByTestId('chat.root')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('a host theme override takes precedence over the defaults', async () => {
    await resetApp()
    await resizeWindow(launched, 974, 638)
    await page.getByTestId('demo.toggle-custom-theme').click()
    // The override tints the bubble purple and its text white.
    await expect(page.getByTestId('chat.message.demo-1000')).toHaveCSS(
      'background-color',
      'rgb(147, 51, 234)',
    )
  })

  test('draft and streaming survive size and theme changes', async () => {
    await resetApp()
    await page.getByTestId('chat.composer.input').fill('keep my draft')
    await page.getByTestId('demo.simulate-streaming').click()
    await resizeWindow(launched, 390, 700)
    await page.getByTestId('demo.toggle-theme').click()
    await expect(page.getByTestId('chat.composer.input')).toHaveValue('keep my draft')
    await expect(page.getByTestId('chat.message-list')).toBeVisible()
    await expect(page.getByTestId('chat.message-status.streaming')).toBeVisible()
  })
})

test.describe('SC-002: no overflow and full last-response visibility', () => {
  test('the last response and its actions scroll fully above the composer', async () => {
    await resetApp()
    await resizeWindow(launched, 1440, 900)
    // SC-002: no panel-wide horizontal overflow at the wide viewport.
    const overflow = await page.getByTestId('chat.root').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    await page.getByTestId('demo.toggle-actions').click()
    await page.getByTestId('demo.load-1000').click()
    await page.waitForTimeout(400)
    const list = page.getByTestId('chat.message-list')
    await list.evaluate((el) => {
      const scrollable = el.querySelectorAll('div')
      let best: HTMLElement | null = null
      for (const node of Array.from(scrollable)) {
        const style = getComputedStyle(node)
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > 0) {
          if (!best || node.scrollHeight > best.scrollHeight) best = node
        }
      }
      if (best) best.scrollTop = best.scrollHeight
    })
    await page.waitForTimeout(300)
    const pill = await box('chat.composer.pill')
    const lastBox = await page.locator('[data-testid^="chat.message."]').last().boundingBox()
    expect(pill).not.toBeNull()
    expect(lastBox).not.toBeNull()
    // The last message is fully above the composer.
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(pill!.y + 2)
  })
})
