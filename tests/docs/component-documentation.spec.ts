import { test, expect } from '@playwright/test'

const baseUrl = process.env.DOCS_BASE_URL ?? 'http://localhost:4173'

test.describe('Documentation site', () => {
  test('landing page has required sections and version', async ({ page }) => {
    await page.goto(baseUrl)
    await expect(page.locator('h1')).toContainText('Build a controlled chat')
    await expect(page.locator('#quick-start')).toBeVisible()
    await expect(page.locator('#examples')).toBeVisible()
    await expect(page.locator('#concepts')).toBeVisible()
    await expect(page.locator('#recipes')).toBeVisible()
    await expect(page.locator('#reference')).toBeVisible()
    await expect(page.locator('#accessibility')).toBeVisible()
    await expect(page.locator('#platforms')).toBeVisible()
    await expect(page.locator('#release-notes')).toBeVisible()
    await expect(page.locator('.version-button')).toContainText('v0.3.0')
  })

  test('navigation links work', async ({ page }) => {
    await page.goto(baseUrl)
    await page.click('a[href="#reference"]')
    await expect(page.locator('#reference')).toBeVisible()
    await expect(page.locator('.doc-section h2').filter({ hasText: 'Reference' })).toBeVisible()
  })

  test('search filters reference table', async ({ page }) => {
    await page.goto(baseUrl)
    await page.fill('#docs-search', 'Chat')
    const rows = page.locator('#reference table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Chat')
    }
  })

  test('live example renders ChatDemo', async ({ page }) => {
    await page.goto(baseUrl)
    const example = page.locator('[data-testid="docs.live-example"]')
    await expect(example).toBeVisible()
    await expect(example.locator('[data-testid="chat.root"]')).toBeVisible()
  })

  test('live demo supports streaming control', async ({ page }) => {
    await page.goto(baseUrl)
    await page.click('[data-testid="demo.simulate-streaming"]')
    await expect(page.locator('[data-testid="chat.message-status.streaming"]')).toBeVisible()
    await page.click('[data-testid="demo.complete-stream"]')
    await expect(page.locator('[data-testid="chat.composer.send"]')).toBeVisible()
  })

  test('reference table has required columns', async ({ page }) => {
    await page.goto(baseUrl)
    const headers = page.locator('#reference table thead th')
    const count = await headers.count()
    expect(count).toBe(6)
    await expect(headers.nth(0)).toContainText('Identifier')
    await expect(headers.nth(2)).toContainText('Required')
  })

  test('accessibility section documents WCAG target', async ({ page }) => {
    await page.goto(baseUrl)
    const section = page.locator('#accessibility')
    await expect(section).toContainText('WCAG 2.2 AA')
    await expect(section).toContainText('Raw HTML is not rendered')
    await expect(section).toContainText('composer')
  })

  test('platform section covers desktop and touch', async ({ page }) => {
    await page.goto(baseUrl)
    const section = page.locator('#platforms')
    await expect(section).toContainText('Desktop and web')
    await expect(section).toContainText('Touch and mobile')
  })
})
