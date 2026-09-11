import { expect, test } from '@playwright/test'
import { closeShell, forceExitShell, launchShell, type LaunchedShell } from './launch-shell'

test.describe('Chat autosave', () => {
  let first: LaunchedShell
  let second: LaunchedShell

  test.afterEach(async () => {
    await closeShell(second)
    await closeShell(first)
  })

  test('persists an idle draft without a save control and restores it after restart', async () => {
    first = await launchShell()
    await expect(first.page.getByTestId('shell.save')).toHaveCount(0)
    await expect(first.page.getByTestId('shell.dirty')).toHaveCount(0)

    await first.page.getByTestId('chat.composer.input').fill('draft saved automatically')
    await first.page.waitForTimeout(2_100)
    await forceExitShell(first.app)

    second = await launchShell({
      userDataDir: first.userDataDir,
      conversationDir: first.conversationDir,
    })
    await expect(second.page.getByTestId('chat.composer.input')).toHaveValue('draft saved automatically')
  })
})
