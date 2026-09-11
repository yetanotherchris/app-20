import { afterEach, describe, expect, it, vi } from 'vitest'
import { AutosaveQueue } from './autosaveQueue'

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

describe('AutosaveQueue', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('serializes writes and saves a fresh latest snapshot after an in-flight write', async () => {
    let snapshot = 'first'
    const firstWrite = deferred()
    const saves: string[] = []
    const queue = new AutosaveQueue({
      createSnapshot: () => snapshot,
      saveSnapshot: async (value) => {
        saves.push(value)
        if (value === 'first') await firstWrite.promise
      },
      onFailure: vi.fn(),
    })

    const first = queue.trigger()
    snapshot = 'second'
    const second = queue.trigger()

    expect(saves).toEqual(['first'])
    firstWrite.resolve()

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(saves).toEqual(['first', 'second'])
  })

  it('saves a draft after the configured idle delay', async () => {
    vi.useFakeTimers()
    const saveSnapshot = vi.fn(async () => {})
    const queue = new AutosaveQueue({
      createSnapshot: () => 'draft',
      saveSnapshot,
      onFailure: vi.fn(),
    })

    queue.scheduleDraftSave()
    await vi.advanceTimersByTimeAsync(1_999)
    expect(saveSnapshot).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(saveSnapshot).toHaveBeenCalledTimes(1)
  })

  it('flushes the current snapshot and cancels a pending draft timer', async () => {
    vi.useFakeTimers()
    const write = deferred()
    const saveSnapshot = vi.fn(async () => write.promise)
    const queue = new AutosaveQueue({
      createSnapshot: () => 'draft',
      saveSnapshot,
      onFailure: vi.fn(),
    })

    queue.scheduleDraftSave()
    const flush = queue.flush()
    let settled = false
    void flush.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    write.resolve()
    await expect(flush).resolves.toBe(true)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(saveSnapshot).toHaveBeenCalledTimes(1)
  })

  it('reports one continuous failure and retries only after another trigger', async () => {
    const failure = new Error('save failed')
    const onFailure = vi.fn()
    const saveSnapshot = vi.fn<() => Promise<void>>()
    saveSnapshot
      .mockRejectedValueOnce(failure)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(failure)
    const queue = new AutosaveQueue({
      createSnapshot: () => 'draft',
      saveSnapshot,
      onFailure,
    })

    await expect(queue.trigger()).resolves.toBe(false)
    expect(saveSnapshot).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(failure)

    await expect(queue.trigger()).resolves.toBe(false)
    expect(saveSnapshot).toHaveBeenCalledTimes(2)
    expect(onFailure).toHaveBeenCalledTimes(1)

    await expect(queue.trigger()).resolves.toBe(true)
    expect(saveSnapshot).toHaveBeenCalledTimes(3)
    expect(onFailure).toHaveBeenCalledTimes(1)

    await expect(queue.trigger()).resolves.toBe(false)
    expect(onFailure).toHaveBeenCalledTimes(2)
  })
})
