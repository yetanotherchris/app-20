import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
// Imports resolve to the built artifact (packages/chat/dist/index.js) via the
// vitest.package.config.ts alias, per FR-015.
import {
  Chat,
  ThemeProvider,
  useTheme,
  MessageList,
  Composer,
  MessageBubble,
  SendButton,
  StopButton,
  lightTheme,
  darkTheme,
  highContrastThemes,
  defaultIcons,
  resolveTheme,
  contrastRatio,
  useSystemAccessibility,
  useFocusRing,
  useMessageFocusPreservation,
  useDomFocusOutlineRef,
  useChatSession,
  minTouchTarget,
  MessageStatusBadge,
  ChatStatusText,
  MESSAGE_STATUS_PRESENTATION,
  CHAT_STATUS_PRESENTATION,
} from '@app-20/chat'

vi.mock('react-native-marked', () => ({
  Renderer: class MockRenderer {
    getKey(): string {
      return 'mock-key'
    }
  },
  useMarkdown: vi.fn(() => null),
}))

vi.mock('@legendapp/list/react-native', () => ({
  LegendList: ({
    data,
    renderItem,
    ListHeaderComponent,
  }: {
    data: readonly unknown[]
    renderItem: (info: { item: unknown }) => React.ReactElement
    ListHeaderComponent?: React.ReactElement | null
  }) => (
    <div data-testid="mock-legend-list">
      {ListHeaderComponent}
      {data.map((item) => renderItem({ item }))}
    </div>
  ),
}))

describe('packaged @app-20/chat artifact (FR-015)', () => {
  it('exports the documented public surface', () => {
    expect(Chat).toBeTypeOf('function')
    expect(ThemeProvider).toBeTypeOf('function')
    expect(useTheme).toBeTypeOf('function')
    expect(MessageList).toBeTypeOf('function')
    expect(Composer).toBeTypeOf('function')
    expect(MessageBubble).toBeTypeOf('function')
    expect(SendButton).toBeTypeOf('function')
    expect(StopButton).toBeTypeOf('function')
    expect(lightTheme).toBeDefined()
    expect(darkTheme).toBeDefined()
    expect(highContrastThemes.light).toBeDefined()
    expect(highContrastThemes.dark).toBeDefined()
    expect(defaultIcons.send).toBeTypeOf('function')
    expect(contrastRatio).toBeTypeOf('function')
    expect(useSystemAccessibility).toBeTypeOf('function')
    expect(useFocusRing).toBeTypeOf('function')
    expect(useMessageFocusPreservation).toBeTypeOf('function')
    expect(useDomFocusOutlineRef).toBeTypeOf('function')
    expect(useChatSession).toBeTypeOf('function')
    expect(minTouchTarget).toBeTypeOf('function')
    expect(MessageStatusBadge).toBeTypeOf('function')
    expect(ChatStatusText).toBeTypeOf('function')
    expect(MESSAGE_STATUS_PRESENTATION.streaming).toBeDefined()
    expect(CHAT_STATUS_PRESENTATION.submitting).toBeDefined()
  })

  it('resolves themes from the artifact', () => {
    const theme = resolveTheme('dark', { colors: { primary: '#ff0000' } })
    expect(theme.colors.primary).toBe('#ff0000')
    expect(theme.colors.text).toBe(darkTheme.colors.text)
  })

  it('resolves the high-contrast palette from the artifact', () => {
    const theme = resolveTheme('dark', undefined, 'high')
    expect(theme.colors.background).toBe(highContrastThemes.dark.colors.background)
    expect(theme.colors.text).toBe('#ffffff')
  })

  it('computes contrast ratios from the artifact', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('renders the Chat component from the artifact', () => {
    render(
      <Chat
        messages={[]}
        draft=""
        status="idle"
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        onChangeDraft={vi.fn()}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        onLoadEarlier={vi.fn()}
      />,
    )
    expect(screen.getByTestId('chat.root')).toBeInTheDocument()
  })
})
