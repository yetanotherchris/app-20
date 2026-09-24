import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface FakeReply {
  /** HTTP status; 400 or above is returned as a JSON error. */
  status?: number
  /** Assistant text deltas to stream. Defaults to an echo of the last user turn. */
  chunks?: readonly string[]
  /** Delay between deltas, to make incremental rendering observable. */
  chunkDelayMs?: number
  /** Keep the stream open after the deltas, without `[DONE]`, until it is aborted. */
  hold?: boolean
  /** Destroy the socket after this many deltas, to simulate a dropped connection. */
  dropAfterChunks?: number
}

export interface RecordedChatRequest {
  authorization: string | null
  body: unknown
}

export interface FakeOpenRouter {
  readonly endpoint: string
  readonly requests: RecordedChatRequest[]
  setReply(reply: FakeReply): void
  reset(): void
  close(): Promise<void>
}

function sseDelta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\n\n`
}

function lastUserContent(body: unknown): string {
  if (body === null || typeof body !== 'object') return ''
  const messages = (body as { messages?: unknown }).messages
  if (!Array.isArray(messages)) return ''
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message === null || typeof message !== 'object') continue
    const entry = message as { role?: unknown; content?: unknown }
    if (entry.role === 'user' && typeof entry.content === 'string') return entry.content
  }
  return ''
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function respond(
  response: ServerResponse,
  body: unknown,
  reply: FakeReply | null,
): Promise<void> {
  const scripted = reply ?? {}

  if (typeof scripted.status === 'number' && scripted.status >= 400) {
    response.statusCode = scripted.status
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: { message: 'fake provider error' } }))
    return
  }

  response.statusCode = 200
  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache')
  response.setHeader('Connection', 'keep-alive')
  response.flushHeaders()

  let closed = false
  response.on('close', () => {
    closed = true
  })

  const deltas = scripted.chunks ?? [`Echo: ${lastUserContent(body)}`]
  for (let index = 0; index < deltas.length; index += 1) {
    if (closed) return
    if (scripted.dropAfterChunks !== undefined && index >= scripted.dropAfterChunks) {
      await delay(150)
      response.destroy()
      return
    }
    try {
      response.write(sseDelta(deltas[index] ?? ''))
    } catch {
      return
    }
    if (scripted.chunkDelayMs) await delay(scripted.chunkDelayMs)
  }

  if (closed) return
  if (scripted.dropAfterChunks !== undefined) {
    await delay(150)
    response.destroy()
    return
  }
  if (scripted.hold) return
  response.write('data: [DONE]\n\n')
  response.end()
}

export async function startFakeOpenRouter(): Promise<FakeOpenRouter> {
  const requests: RecordedChatRequest[] = []
  let reply: FakeReply | null = null

  const server: Server = createServer((request, response) => {
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.end()
      return
    }
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      let body: unknown = null
      try {
        body = JSON.parse(raw)
      } catch {
        body = raw
      }
      requests.push({ authorization: request.headers.authorization ?? null, body })
      void respond(response, body, reply)
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  server.keepAliveTimeout = 1000
  server.headersTimeout = 2000
  const address = server.address() as AddressInfo

  return {
    endpoint: `http://127.0.0.1:${address.port}/api/v1/chat/completions`,
    requests,
    setReply(next) {
      reply = next
    },
    reset() {
      requests.length = 0
      reply = null
    },
    close() {
      return new Promise((resolve) => {
        // Destroy keep-alive sockets first; otherwise close() waits on them and
        // a hung app would stall worker teardown.
        server.closeAllConnections()
        server.close(() => resolve())
      })
    },
  }
}
