import { dialog } from 'electron'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type { AppErrorCode, Result } from '../shared/error-codes'
import type { WorkspaceInfo } from '../shared/ipc-contract'
import { AppError, err, failure, ok } from './errors'
import { resolveRealRoot } from './paths'
import { readSettings, writeSettings } from './settings'

let workspaceRoot: string | null = null
let workspaceLoadError: AppErrorCode | null = null

function workspaceInfo(realRoot: string): WorkspaceInfo {
  return {
    displayName: basename(realRoot),
    id: createHash('sha256').update(realRoot).digest('hex').slice(0, 16),
  }
}

async function forgetWorkspace(): Promise<void> {
  workspaceRoot = null
  workspaceLoadError = 'read-failed'
  await writeSettings({}).catch(() => undefined)
}

export async function loadWorkspace(): Promise<void> {
  try {
    const settings = await readSettings()
    workspaceLoadError = null
    if (!settings.workspacePath) {
      workspaceRoot = null
      return
    }

    try {
      workspaceRoot = await resolveRealRoot(settings.workspacePath)
    } catch {
      await forgetWorkspace()
    }
  } catch {
    // A settings failure must not block startup; the renderer falls back to onboarding.
    workspaceRoot = null
  }
}

export async function requireWorkspaceRoot(): Promise<string> {
  if (!workspaceRoot) throw new AppError('no-workspace')
  return workspaceRoot
}

export async function getWorkspaceInfo(): Promise<Result<WorkspaceInfo | null>> {
  if (workspaceRoot) {
    try {
      workspaceRoot = await resolveRealRoot(workspaceRoot)
      return ok(workspaceInfo(workspaceRoot))
    } catch {
      await forgetWorkspace()
    }
  }

  if (workspaceLoadError) return err(workspaceLoadError)
  return ok(null)
}

export async function chooseWorkspace(): Promise<Result<WorkspaceInfo>> {
  const result = await dialog.showOpenDialog({
    title: 'Open Workspace Folder',
    properties: ['openDirectory'],
  })
  const chosen = result.filePaths[0]
  if (result.canceled || !chosen) return err('chooser-cancelled')
  return adoptWorkspace(chosen)
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
    workspaceLoadError = null
    await writeSettings({ workspacePath: real })
    return ok(workspaceInfo(real))
  } catch (error) {
    return failure(error)
  }
}
