import { join } from 'node:path'
import { _electron, type ElectronApplication, type Page } from '@playwright/test'

interface ChatScrollableWindow extends Window {
  __findChatScrollable: () => HTMLElement | null
}

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
}

export async function launchElectron(): Promise<LaunchedApp> {
  const main = join(process.cwd(), 'apps/electron/out/main/index.js')
  const app = await _electron.launch({ args: [main] })
  const page = await app.firstWindow()
  await page.addInitScript(() => {
    // Expose the chat list's scroll container finder to test helpers.
    ;(window as ChatScrollableWindow).__findChatScrollable = () => {
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
  // The init script only applies on navigation, so reload once to install it.
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}

export async function closeElectron(launched: LaunchedApp): Promise<void> {
  await launched.app.close()
}

export async function getScrollableOffset(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as ChatScrollableWindow).__findChatScrollable()?.scrollTop ?? -1,
  )
}

export async function scrollListTo(page: Page, offset: number): Promise<void> {
  await page.evaluate((offsetValue) => {
    const scrollable = (window as ChatScrollableWindow).__findChatScrollable()
    if (!scrollable) return
    scrollable.scrollTop = offsetValue
    scrollable.dispatchEvent(new Event('scroll', { bubbles: true }))
  }, offset)
}

export async function getScrollHeight(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as ChatScrollableWindow).__findChatScrollable()?.scrollHeight ?? 0,
  )
}

/**
 * Measures the worst frame gap while scrolling through a bounded window of
 * the list, yielding to the event loop after each step so the list engine,
 * React, and paint actually run between samples. SC-001 requires no stall
 * longer than 100 ms. The sweep covers about ten viewport heights, enough to
 * force row mounts and virtualization changes, without spending seconds
 * walking a very long list.
 */
export async function measureScrollStall(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const scrollable = (window as ChatScrollableWindow).__findChatScrollable()
    if (!scrollable) return 0
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    let worst = 0
    let last = performance.now()
    const distance = scrollable.clientHeight * 10
    const max = Math.min(scrollable.scrollHeight, distance)
    for (let y = 0; y <= max; y += 500) {
      scrollable.scrollTop = y
      await frame()
      const now = performance.now()
      worst = Math.max(worst, now - last)
      last = now
    }
    return worst
  })
}
