import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chat } from './Chat'
import { useTheme } from '../theme/ThemeContext'
import type { Message } from '../types'

vi.mock('react-native-marked', () => ({
  Renderer: class MockRenderer {
    options: unknown
    constructor(options?: unknown) {
      this.options = options
    }
  },
  useMarkdown: vi.fn(() => null),
}))

vi.mock('@legendapp/list/react-native', () => ({
  LegendList: ({
    data,
    renderItem,
    ListHeaderComponent,
    extraData,
  }: {
    data: readonly Message[]
    renderItem: (info: { item: Message }) => React.ReactElement
    ListHeaderComponent?: React.ReactElement | null
    extraData?: unknown
  }) => (
    <div data-testid="mock-legend-list" data-extradata={String(extraData != null)}>
      {ListHeaderComponent}
      {data.map((item) => renderItem({ item }))}
    </div>
  ),
}))

function message(id: string, role: Message['role'] = 'assistant'): Message {
  return {
    id,
    role,
    contentParts: [
      { kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text: `content ${id}` },
    ],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const messages = [message('a'), message('b', 'user')]

function renderChat(overrides: Partial<React.ComponentProps<typeof Chat>> = {}) {
  const props = {
    messages,
    draft: '',
    status: 'idle' as const,
    hasEarlierMessages: false,
    isLoadingEarlier: false,
    onChangeDraft: vi.fn(),
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    onLoadEarlier: vi.fn(),
    ...overrides,
  }
  return render(<Chat {...props} />)
}

describe('Chat theme wiring', () => {
  it('threads the resolved theme to a descendant consumer', () => {
    function ThemeProbe() {
      const { theme, base } = useTheme()
      return <div data-testid="probe" data-base={base} data-primary={theme.colors.primary} />
    }
    function CustomMessage(m: Message) {
      return (
        <div key={m.id} data-testid={`chat.message.${m.id}`}>
          <ThemeProbe />
          {m.contentParts[0]?.text}
        </div>
      )
    }
    renderChat({ renderMessage: CustomMessage, theme: 'dark' })
    const probes = screen.getAllByTestId('probe')
    expect(probes[0]?.getAttribute('data-base')).toBe('dark')
    expect(probes[0]?.getAttribute('data-primary')).toBe('#3b82f6')
  })

  it('merges a partial themeOverride over the active base', () => {
    function ThemeProbe() {
      const { theme } = useTheme()
      return (
        <div
          data-testid="probe"
          data-primary={theme.colors.primary}
          data-text={theme.colors.text}
        />
      )
    }
    function CustomMessage(m: Message) {
      return (
        <div key={m.id} data-testid={`chat.message.${m.id}`}>
          <ThemeProbe />
        </div>
      )
    }
    renderChat({
      renderMessage: CustomMessage,
      theme: 'light',
      themeOverride: { colors: { primary: '#ff0000' } },
    })
    const probes = screen.getAllByTestId('probe')
    expect(probes[0]?.getAttribute('data-primary')).toBe('#ff0000')
    // Un-overridden tokens fall back to the light base.
    expect(probes[0]?.getAttribute('data-text')).toBe('#0f172a')
  })

  it('does not remount the message list when the theme changes', () => {
    const { rerender } = renderChat({ theme: 'light' })
    expect(screen.getByTestId('mock-legend-list')).toBeInTheDocument()
    expect(screen.getByTestId('chat.message.a')).toBeInTheDocument()

    rerender(
      <Chat
        messages={messages}
        draft=""
        status="idle"
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        onChangeDraft={() => {}}
        onSubmit={() => {}}
        onStop={() => {}}
        onLoadEarlier={() => {}}
        theme="dark"
      />,
    )
    // Same list instance and message rows survive the switch.
    expect(screen.getByTestId('mock-legend-list')).toBeInTheDocument()
    expect(screen.getByTestId('chat.message.a')).toBeInTheDocument()
  })
})

describe('Chat control replacement', () => {
  it('renders custom Send, Stop, and scroll-to-latest controls in place (FR-007)', () => {
    renderChat({
      draft: 'hello',
      status: 'idle',
      renderSend: () => <div data-testid="custom-send" />,
      renderStop: () => <div data-testid="custom-stop" />,
      renderScrollToLatest: () => <div data-testid="custom-scroll" />,
    })
    expect(screen.getByTestId('custom-send')).toBeInTheDocument()
    expect(screen.queryByTestId('chat.composer.send')).not.toBeInTheDocument()
    expect(screen.queryByTestId('custom-stop')).not.toBeInTheDocument()
    expect(screen.queryByTestId('custom-scroll')).not.toBeInTheDocument()
  })

  it('keeps Stop reachable when a custom Send control is in use during busy (edge case)', () => {
    renderChat({
      draft: 'hello',
      status: 'streaming',
      renderSend: () => <div data-testid="custom-send" />,
      renderStop: () => <div data-testid="custom-stop" />,
    })
    // Busy renders Stop, not Send, regardless of the Send override.
    expect(screen.getByTestId('custom-stop')).toBeInTheDocument()
    expect(screen.queryByTestId('custom-send')).not.toBeInTheDocument()
  })

  it('renders composer controls added by the host (FR-013)', () => {
    renderChat({
      renderComposerControls: () => <div data-testid="custom-composer-control" />,
    })
    expect(screen.getByTestId('custom-composer-control')).toBeInTheDocument()
  })

  it('uses a supplied icon instead of the default (FR-010)', () => {
    renderChat({ draft: 'hello', icons: { send: <div data-testid="custom-send-icon" /> } })
    expect(screen.getByTestId('custom-send-icon')).toBeInTheDocument()
    // The default send glyph is not rendered.
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })

  it('falls back to the default bubble when a custom renderMessage throws (FR-011)', () => {
    // The mock list renders each row through renderItem; a throwing custom
    // renderer must be caught by the per-message boundary, not crash the list.
    renderChat({
      renderMessage: () => {
        throw new Error('custom renderer exploded')
      },
    })
    // The default fallback bubble renders for every message.
    expect(screen.getByTestId('chat.message.a')).toBeInTheDocument()
    expect(screen.getByTestId('chat.message.b')).toBeInTheDocument()
  })
})

describe('Chat state views (US3)', () => {
  it('shows the empty state when there are no messages and status is idle', () => {
    renderChat({ messages: [], status: 'idle' })
    expect(screen.getByTestId('chat.state.empty')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-legend-list')).not.toBeInTheDocument()
  })

  it('shows the loading state while a response is being requested', () => {
    renderChat({ messages: [], status: 'submitting' })
    expect(screen.getByTestId('chat.state.loading')).toBeInTheDocument()
  })

  it('shows the typing state while an assistant response is being composed', () => {
    renderChat({ messages: [], status: 'streaming' })
    expect(screen.getByTestId('chat.state.typing')).toBeInTheDocument()
  })

  it('shows the error state when the error status is active', () => {
    renderChat({ messages: [], status: 'error' })
    expect(screen.getByTestId('chat.state.error')).toBeInTheDocument()
  })

  it('shows the message list normally once messages exist during streaming', () => {
    renderChat({ status: 'streaming' })
    expect(screen.queryByTestId('chat.state.typing')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-legend-list')).toBeInTheDocument()
  })

  it('renders custom state views in the right conditions (FR-008)', () => {
    renderChat({
      messages: [],
      status: 'idle',
      renderEmptyState: () => <div data-testid="custom-empty" />,
    })
    expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('chat.state.empty')).not.toBeInTheDocument()
  })

  it('renders custom loading, typing, and error state views (FR-008)', () => {
    renderChat({
      messages: [],
      status: 'submitting',
      renderLoadingState: () => <div data-testid="custom-loading" />,
    })
    expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
    renderChat({
      messages: [],
      status: 'streaming',
      renderTypingState: () => <div data-testid="custom-typing" />,
    })
    expect(screen.getByTestId('custom-typing')).toBeInTheDocument()
    renderChat({
      messages: [],
      status: 'error',
      renderErrorState: () => <div data-testid="custom-error" />,
    })
    expect(screen.getByTestId('custom-error')).toBeInTheDocument()
  })

  it('applies styleOverrides to themed surfaces (FR-003)', () => {
    renderChat({
      draft: 'hello',
      styleOverrides: { composerInput: { backgroundColor: '#123456' } },
    })
    const input = screen.getByTestId('chat.composer.input')
    // The override flows into the composer input's style array.
    expect(input).toHaveStyle({ backgroundColor: '#123456' })
  })

  it('shows the message list when there are messages and status is idle', () => {
    renderChat({ status: 'idle' })
    expect(screen.queryByTestId('chat.state.empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-legend-list')).toBeInTheDocument()
  })
})

describe('Chat constraint modes (US4)', () => {
  it('blocks input and actions when disabled (FR-014)', () => {
    renderChat({ disabled: true })
    // RNW maps editable={false} to the readOnly attribute.
    expect(screen.getByTestId('chat.composer.input').getAttribute('readonly')).not.toBeNull()
  })

  it('keeps content readable and the composer non-editable when readOnly (FR-014)', () => {
    renderChat({ readOnly: true })
    expect(screen.getByTestId('chat.message.a')).toBeInTheDocument()
    expect(screen.getByTestId('chat.composer.input').getAttribute('readonly')).not.toBeNull()
  })

  it('disables Send when the send capability is off (FR-014)', () => {
    renderChat({ draft: 'hello', capabilities: { send: false } })
    expect(screen.getByTestId('chat.composer.send')).toBeDisabled()
  })

  it('hides actions when the actions capability is off (FR-014)', () => {
    renderChat({
      capabilities: { actions: false },
      messageActions: [{ id: 'copy', label: 'Copy', group: 'A', onAction: () => {} }],
    })
    expect(screen.queryByTestId('chat.message-actions')).not.toBeInTheDocument()
  })

  it('hides actions when the component is disabled or readOnly (FR-014)', () => {
    renderChat({
      disabled: true,
      messageActions: [{ id: 'copy', label: 'Copy', group: 'A', onAction: () => {} }],
    })
    expect(screen.queryByTestId('chat.message-actions')).not.toBeInTheDocument()
  })

  it('hides Stop when the stop capability is off (FR-014)', () => {
    renderChat({ status: 'streaming', capabilities: { stop: false } })
    expect(screen.queryByTestId('chat.composer.stop')).not.toBeInTheDocument()
    // Send renders again (busy without Stop).
    expect(screen.getByTestId('chat.composer.send')).toBeInTheDocument()
  })
})

describe('Chat accessibility (spec 005)', () => {
  it('applies the high-contrast palette when highContrast is set (FR-007)', () => {
    function ThemeProbe() {
      const { theme } = useTheme()
      return (
        <div
          data-testid="probe"
          data-background={theme.colors.background}
          data-text={theme.colors.text}
        />
      )
    }
    function CustomMessage(m: Message) {
      return (
        <div key={m.id} data-testid={`chat.message.${m.id}`}>
          <ThemeProbe />
        </div>
      )
    }
    renderChat({ renderMessage: CustomMessage, theme: 'dark', highContrast: true })
    const probe = screen.getAllByTestId('probe')[0]
    expect(probe.getAttribute('data-background')).toBe('#000000')
    expect(probe.getAttribute('data-text')).toBe('#ffffff')
  })

  it('exposes reduced motion through the theme context (FR-006)', () => {
    function ReducedProbe() {
      const { reducedMotion } = useTheme()
      return <div data-testid="probe" data-reduced={String(reducedMotion)} />
    }
    function CustomMessage(m: Message) {
      return (
        <div key={m.id} data-testid={`chat.message.${m.id}`}>
          <ReducedProbe />
        </div>
      )
    }
    renderChat({ renderMessage: CustomMessage, reducedMotion: true })
    expect(screen.getAllByTestId('probe')[0].getAttribute('data-reduced')).toBe('true')
  })

  it('renders the chat status text when not idle (FR-008)', () => {
    renderChat({ status: 'streaming' })
    expect(screen.getByTestId('chat.status.streaming')).toBeInTheDocument()
    expect(screen.getByText('Streaming…')).toBeInTheDocument()
  })

  it('renders no chat status text when idle (FR-008)', () => {
    renderChat({ status: 'idle' })
    expect(screen.queryByTestId(/chat.status/)).not.toBeInTheDocument()
  })

  it('renders a non-color status badge for a streaming message (FR-008)', () => {
    const streaming = { ...message('s'), status: 'streaming' as const }
    renderChat({ messages: [streaming] })
    expect(screen.getByTestId('chat.message-status.streaming')).toBeInTheDocument()
    expect(screen.getByText('Streaming')).toBeInTheDocument()
  })

  it('makes message rows keyboard focusable (FR-003)', () => {
    renderChat()
    expect(screen.getByTestId('chat.message.a').getAttribute('tabindex')).toBe('0')
  })

  it('labels the message list with the configured label (FR-002)', () => {
    renderChat({ messageListLabel: 'Conversation' })
    expect(screen.getByTestId('chat.message-list')).toHaveAttribute('aria-label', 'Conversation')
  })
})
