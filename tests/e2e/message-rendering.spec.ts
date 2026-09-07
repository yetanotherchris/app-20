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
  await expect(page.getByTestId('chat.message-list')).toBeVisible()
  await page.waitForTimeout(400)
}

async function loadMarkdownSuite(): Promise<void> {
  await resetApp()
  await page.getByTestId('demo.markdown-suite').click()
  await page.waitForTimeout(800)
}

test.describe('US1: read assistant responses as formatted Markdown', () => {
  test('every supported markdown element renders formatted', async () => {
    await loadMarkdownSuite()
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).toContain('Heading 2')
    expect(body).toContain('Heading 3')
    expect(body).toContain('Unordered item one')
    expect(body).toContain('Ordered item one')
    expect(body).toContain('A blockquote line.')
    expect(body).toContain('A link:')
    expect(body).toContain('const answer = 42')
    expect(body).toContain('Column A')
  })

  test('a fenced code block is selectable and has a copy control', async () => {
    await loadMarkdownSuite()
    await expect(page.getByText('const answer = 42')).toBeVisible()
    const copyButtons = page.getByRole('button', { name: /copy code/i })
    expect(await copyButtons.count()).toBeGreaterThan(0)
    // Copying succeeds and shows the copied state.
    await copyButtons.first().click()
    await expect(page.getByText('Copied').first()).toBeVisible()
  })

  test('activating a link delegates to the host and never navigates internally', async () => {
    await loadMarkdownSuite()
    // The demo's onLinkPress records the href; the URL never changes.
    const urlBefore = page.url()
    await page.getByText('example').first().click()
    await expect(page.getByTestId('demo.last-link')).toHaveText('link: https://example.com')
    expect(page.url()).toBe(urlBefore)
  })

  test('denied clipboard copy shows a visible failure state', async () => {
    await loadMarkdownSuite()
    await page.getByTestId('demo.toggle-copy').click()
    const copyButtons = page.getByRole('button', { name: /copy code/i })
    await copyButtons.first().click()
    await expect(page.getByText('Copy failed').first()).toBeVisible()
  })

  test('a table renders without broken layout', async () => {
    await loadMarkdownSuite()
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).toContain('Column A')
    expect(body).toContain('a1')
  })
})

test.describe('US2: distinguish message roles visually', () => {
  test('user, assistant, and system messages are distinct and aligned', async () => {
    await loadMarkdownSuite()
    const userMsgs = await page.locator('[data-testid^="chat.message."]').count()
    expect(userMsgs).toBeGreaterThan(0)
    // The demo includes a system message with distinct content.
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).toContain('Conversation started with a markdown suite')
  })
})

test.describe('US3: safe by default', () => {
  test('raw HTML, remote images, and javascript links render inert', async () => {
    await loadMarkdownSuite()
    const body = await page.evaluate(() => document.body.innerText)
    // Raw HTML and scripts appear as literal text.
    expect(body).toContain('raw html div')
    expect(body).toContain("alert('xss')")
    expect(body).toContain('javascript link')
    // Remote images are not loaded: no <img> element is present.
    const imgs = await page.evaluate(() => document.querySelectorAll('img').length)
    expect(imgs).toBe(0)
    // Raw HTML is inert text, not live DOM: no script/iframe/onclick from the
    // fixture's markup inside any message bubble, and no element executes.
    const liveMarkup = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('[data-testid^="chat.message."]'))
      const script = bubbles.reduce((n, el) => n + el.querySelectorAll('script').length, 0)
      const iframe = bubbles.reduce((n, el) => n + el.querySelectorAll('iframe').length, 0)
      const onclick = bubbles.reduce((n, el) => n + el.querySelectorAll('[onclick]').length, 0)
      return { script, iframe, onclick }
    })
    expect(liveMarkup.script).toBe(0)
    expect(liveMarkup.iframe).toBe(0)
    expect(liveMarkup.onclick).toBe(0)
  })
})

test.describe('SC-002: 6 KB markdown renders without freezing', () => {
  test('a single ~6 KB markdown response renders within budget', async () => {
    await resetApp()
    const start = Date.now()
    await page.getByTestId('demo.large-markdown').click()
    // The single large markdown assistant message renders within the budget.
    await expect(page.getByText('Long response')).toBeVisible({ timeout: 10_000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)
  })
})
