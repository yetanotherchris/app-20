import { dialog } from 'electron'
import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type { WorkspaceInfo } from '../shared/ipc-contract'
import { AppError, err, failure, ok } from './errors'
import { resolveRealRoot } from './paths'
import { readSettings, writeSettings } from './settings'
import type { Result } from '../shared/error-codes'

let workspaceRoot: string | null = null

export async function loadWorkspace(): Promise<void> {
  const settings = await readSettings()
  if (!settings.workspacePath) {
    workspaceRoot = null
    return
  }

  try {
    workspaceRoot = await resolveRealRoot(settings.workspacePath)
  } catch {
    workspaceRoot = null
    await writeSettings({})
  }
}

export async function requireWorkspaceRoot(): Promise<string> {
  if (!workspaceRoot) throw new AppError('no-workspace')
  return workspaceRoot
}

export async function getWorkspaceInfo(): Promise<WorkspaceInfo | null> {
  if (!workspaceRoot) return null

  try {
    workspaceRoot = await resolveRealRoot(workspaceRoot)
    return { displayName: basename(workspaceRoot) }
  } catch {
    workspaceRoot = null
    await writeSettings({})
    return null
  }
}

export async function chooseWorkspace(): Promise<Result<WorkspaceInfo>> {
  const result = await dialog.showOpenDialog({
    title: 'Open Workspace Folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return err('chooser-cancelled')
  return adoptWorkspace(result.filePaths[0] as string)
}

export async function createWorkspace(): Promise<Result<WorkspaceInfo>> {
  const result = await dialog.showSaveDialog({
    title: 'Create Workspace Folder',
    defaultPath: 'app-20-workspace',
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  })
  if (result.canceled || !result.filePath) return err('chooser-cancelled')

  try {
    await fs.mkdir(result.filePath, { recursive: true })
  } catch {
    return err('write-failed')
  }
  return adoptWorkspace(result.filePath)
}

async function adoptWorkspace(path: string): Promise<Result<WorkspaceInfo>> {
  try {
    const real = await resolveRealRoot(path)
    workspaceRoot = real
    await writeSettings({ workspacePath: real })
    return ok({ displayName: basename(real) })
  } catch (error) {
    return failure(error)
  }
}
