import { join } from 'node:path'
import { _electron, type ElectronApplication, type Page } from '@playwright/test'

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
}

export async function launchElectron(): Promise<LaunchedApp> {
  const main = join(process.cwd(), 'apps/electron/out/main/index.js')
  const app = await _electron.launch({ args: [main] })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.addInitScript(() => {
    // Expose the chat list's scroll container finder to test helpers.
    ;(
      window as unknown as { __findChatScrollable: () => HTMLElement | null }
    ).__findChatScrollable = () => {
      const root = document.querySelector('[data-testid="chat.message-list"]')
      if (!root) return null
      const candidates = Array.from(root.querySelectorAll('div')).filter((el) => {
        const style = getComputedStyle(el)
        return style.overflowY === 'auto' || style.overflowY === 'scroll'
      })
      if (candidates.length === 0) return null
      return candidates.reduce((a, b) => (a.scrollHeight > b.scrollHeight ? a : b))
    }
  })
  return { app, page }
}

export async function closeElectron(launched: LaunchedApp): Promise<void> {
  await launched.app.close()
}

export async function getScrollableOffset(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scrollable = (
      window as unknown as { __findChatScrollable: () => HTMLElement | null }
    ).__findChatScrollable()
    return scrollable ? scrollable.scrollTop : -1
  })
}

export async function scrollListTo(page: Page, offset: number): Promise<void> {
  await page.evaluate((offsetValue) => {
    const scrollable = (
      window as unknown as { __findChatScrollable: () => HTMLElement | null }
    ).__findChatScrollable()
    if (!scrollable) return
    scrollable.scrollTop = offsetValue
    scrollable.dispatchEvent(new Event('scroll', { bubbles: true }))
  }, offset)
}

export async function getScrollHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scrollable = (
      window as unknown as { __findChatScrollable: () => HTMLElement | null }
    ).__findChatScrollable()
    return scrollable ? scrollable.scrollHeight : 0
  })
}

/**
 * Measures the worst frame gap while scrolling through the whole list in one
 * pass. SC-001 requires no stall longer than 100 ms.
 */
export async function measureScrollStall(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scrollable = (
      window as unknown as { __findChatScrollable: () => HTMLElement | null }
    ).__findChatScrollable()
    if (!scrollable) return 0
    let worst = 0
    let last = performance.now()
    const max = scrollable.scrollHeight
    for (let y = 0; y <= max; y += 500) {
      scrollable.scrollTop = y
      const now = performance.now()
      worst = Math.max(worst, now - last)
      last = now
    }
    return worst
  })
}
