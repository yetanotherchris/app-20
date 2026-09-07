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
  return { app, page }
}

export async function closeElectron(launched: LaunchedApp): Promise<void> {
  await launched.app.close()
}

export async function getScrollableOffset(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="chat.message-list"]')
    if (!root) return -1
    const candidates = Array.from(root.querySelectorAll('div')).filter((el) => {
      const style = getComputedStyle(el)
      return style.overflowY === 'auto' || style.overflowY === 'scroll'
    })
    if (candidates.length === 0) return -1
    const scrollable = candidates.reduce((a, b) => (a.scrollHeight > b.scrollHeight ? a : b))
    return scrollable.scrollTop
  })
}

export async function scrollListTo(page: Page, offset: number): Promise<void> {
  await page.evaluate((offsetValue) => {
    const root = document.querySelector('[data-testid="chat.message-list"]')
    if (!root) return
    const candidates = Array.from(root.querySelectorAll('div')).filter((el) => {
      const style = getComputedStyle(el)
      return style.overflowY === 'auto' || style.overflowY === 'scroll'
    })
    if (candidates.length === 0) return
    const scrollable = candidates.reduce((a, b) => (a.scrollHeight > b.scrollHeight ? a : b))
    scrollable.scrollTop = offsetValue
    scrollable.dispatchEvent(new Event('scroll', { bubbles: true }))
  }, offset)
}
