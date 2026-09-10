import { describe, expect, it } from 'vitest'
import { APP_ERROR_CODES, ERROR_MESSAGES } from '../shared/error-codes'
import {
  IPC_CHANNELS,
  IPC_EVENT_CHANNELS,
  type AllChannelsListed,
  type AllEventChannelsListed,
} from '../shared/ipc-contract'

const EXPECTED_CHANNELS = [
  'app:get-version',
  'folder:get',
  'folder:list',
  'folder:reveal',
  'file:read',
  'file:write',
  'secrets:import-provider-key',
  'secrets:import-s3',
  'secrets:status',
  'shell:open-external',
  'app:close-decision',
] as const

const EXPECTED_EVENT_CHANNELS = ['app:close-requested', 'menu:command'] as const

describe('IPC channel contract', () => {
  it('lists every declared invoke channel exactly once', () => {
    // Fails to compile if a channel is added to IpcContract but not IPC_CHANNELS.
    const allListed: AllChannelsListed = true
    expect(allListed).toBe(true)
    expect([...IPC_CHANNELS]).toEqual([...EXPECTED_CHANNELS])
    expect(new Set(IPC_CHANNELS).size).toBe(IPC_CHANNELS.length)
  })

  it('lists every declared event channel exactly once', () => {
    const allListed: AllEventChannelsListed = true
    expect(allListed).toBe(true)
    expect([...IPC_EVENT_CHANNELS]).toEqual([...EXPECTED_EVENT_CHANNELS])
  })

  it('exposes no generic invoke, send, or on channel', () => {
    for (const channel of [...IPC_CHANNELS, ...IPC_EVENT_CHANNELS]) {
      expect(channel).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
      expect(channel).not.toMatch(/^(invoke|send|ipc|on)$/)
    }
  })
})

describe('error code contract', () => {
  it('exposes a closed, duplicate-free set of codes', () => {
    expect(new Set(APP_ERROR_CODES).size).toBe(APP_ERROR_CODES.length)
    expect([...APP_ERROR_CODES].sort()).toEqual(Object.keys(ERROR_MESSAGES).sort())
  })

  it('has a non-empty, path-free message for every code', () => {
    for (const code of APP_ERROR_CODES) {
      const message = ERROR_MESSAGES[code]
      expect(message.length).toBeGreaterThan(0)
      expect(/[A-Za-z]:\\/.test(message)).toBe(false)
      expect(/\/(?:home|Users|root)\//.test(message)).toBe(false)
    }
  })
})
