import { describe, expect, it } from 'vitest'
import { ProviderError } from './errors'
import { parseOpenRouterStream } from './stream'
import { streamFromStrings } from './testing'

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

async function collect(source: AsyncIterable<string>): Promise<string[]> {
  const result: string[] = []
  for await (const value of source) result.push(value)
  return result
}

describe('parseOpenRouterStream', () => {
  it('yields each delta in order and stops at [DONE]', async () => {
    const chunks = [delta('Hello'), delta(' world'), 'data: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual([
      'Hello',
      ' world',
    ])
  })

  it('decodes a data line split across two network chunks', async () => {
    const chunks = ['data: {"choices":[{"delta"', ':{"content":"Hi"}}]}\n\ndata: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['Hi'])
  })

  it('skips blank lines, comments, and unparseable payloads', async () => {
    const chunks = [
      '\n',
      ': comment\n',
      'data: {not json}\n\n',
      'data: {"choices":[]}\n\n',
      delta('kept'),
      'data: [DONE]\n\n',
    ]
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['kept'])
  })

  it('ignores an empty content delta', async () => {
    const chunks = [delta(''), delta('real'), 'data: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['real'])
  })

  it('throws a network error when the stream ends before [DONE]', async () => {
    await expect(
      collect(parseOpenRouterStream(streamFromStrings([delta('partial')]))),
    ).rejects.toThrow(ProviderError)
  })
})
