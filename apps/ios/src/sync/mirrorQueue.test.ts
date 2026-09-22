import { describe, expect, it, vi } from 'vitest'
import { MirrorQueue, type MirrorOperation, type MirrorQueueStorage } from './mirrorQueue'

function storage(seed: MirrorOperation[] = []): MirrorQueueStorage & { values: MirrorOperation[] } {
  const result = {
    values: seed,
    read: vi.fn(async () => result.values),
    write: vi.fn(async (values: readonly MirrorOperation[]) => {
      result.values = [...values]
    }),
  }
  return result
}

describe('MirrorQueue', () => {
  it('persists the newest operation before writing it once to the remote', async () => {
    const queueStorage = storage()
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn(),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    await queue.schedule({ name: 'c.json', revision: 1, content: 'old' })
    await queue.schedule({ name: 'c.json', revision: 2, content: 'new' })
    await queue.run()

    expect(queueStorage.write).toHaveBeenCalled()
    expect(remote.writeText).toHaveBeenLastCalledWith('c.json', 'new')
    expect(queueStorage.values).toEqual([])
  })

  it('keeps failed operations for a later retry without modifying local storage', async () => {
    const queueStorage = storage([{ name: 'c.json', revision: 1, content: 'content' }])
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn().mockRejectedValue(new Error('offline')),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    await queue.run()

    expect(queueStorage.values).toEqual([{ name: 'c.json', revision: 1, content: 'content' }])
  })
})
