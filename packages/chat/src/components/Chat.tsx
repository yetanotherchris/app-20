import { useCallback } from 'react'
import { View } from 'react-native'
import { ThemeProvider, useTheme } from '../theme/ThemeContext'
import type {
  Capabilities,
  ChatStatus,
  IconName,
  MessageAction,
  SurfaceStyleOverrides,
  ThemeInput,
  ThemeName,
} from '../theme/types'
import type { Message, VisibleRange } from '../types'
import { MessageList, type MessageListProps } from './MessageList'
import { Composer, type ComposerProps } from './Composer'
import { MessageBubble } from './MessageBubble'
import { MessageRendererBoundary } from './MessageRendererBoundary'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { TypingState } from './TypingState'
import { ErrorState } from './ErrorState'
import type { ContentRendererProps } from '../rendering/ContentRenderer'
import type { MarkdownElementRenderers } from '../rendering/MarkdownRenderer'
import type { RendererInterface } from 'react-native-marked'
import type { SendButtonProps } from './SendButton'
import type { StopButtonProps } from './StopButton'
import type { ScrollToLatestControlProps } from './ScrollToLatestControl'

export interface ChatProps {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  hasEarlierMessages: boolean
  isLoadingEarlier: boolean
  onChangeDraft: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  onLoadEarlier: () => void
  onScrollToLatest?: () => void
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void | Promise<void>
  onMessageAction?: (action: MessageAction, message: Message) => void
  theme?: ThemeName
  themeOverride?: ThemeInput
  styleOverrides?: SurfaceStyleOverrides
  renderMessage?: (message: Message) => React.ReactElement
  contentRenderers?: ContentRendererProps['contentRenderers']
  markdownElementRenderers?: MarkdownElementRenderers
  markdownRenderer?: RendererInterface
  renderSend?: (props: SendButtonProps) => React.ReactElement
  renderStop?: (props: StopButtonProps) => React.ReactElement
  renderScrollToLatest?: (props: ScrollToLatestControlProps) => React.ReactElement
  renderComposerControls?: () => React.ReactNode
  renderEmptyState?: () => React.ReactElement
  renderLoadingState?: () => React.ReactElement
  renderTypingState?: () => React.ReactElement
  renderErrorState?: () => React.ReactElement
  messageActions?: readonly MessageAction[]
  icons?: Partial<Record<IconName, React.ReactNode>>
  disabled?: boolean
  readOnly?: boolean
  capabilities?: Capabilities
  followThreshold?: number
  loadEarlierLabel?: string
  scrollToLatestLabel?: string
  sendLabel?: string
  stopLabel?: string
  placeholder?: string
  maxHeight?: number
  minHeight?: number
  blurBehavior?: 'send' | 'keep'
  dismissKeyboardOnSend?: boolean
  onAtBottomChange?: (isAtBottom: boolean) => void
  onUnreadCountChange?: (count: number) => void
  onVisibleRangeChange?: (range: VisibleRange) => void
}

type StateViewKind = 'empty' | 'loading' | 'typing' | 'error' | 'none'

function stateKindFor(status: ChatStatus, messages: readonly Message[]): StateViewKind {
  // Error is a conversation-level state (US3-A3): the configured error view
  // replaces the list whenever the error status is active.
  if (status === 'error') return 'error'
  // Empty/loading/typing states occupy the list only while there is nothing
  // to show; once messages exist the list renders normally (US3 scenarios).
  if (messages.length === 0) {
    if (status === 'submitting') return 'loading'
    if (status === 'streaming') return 'typing'
    return 'empty'
  }
  return 'none'
}

function ChatInner(props: ChatProps) {
  const { theme } = useTheme()
  const {
    messages,
    draft,
    status,
    hasEarlierMessages,
    isLoadingEarlier,
    onChangeDraft,
    onSubmit,
    onStop,
    onLoadEarlier,
    onScrollToLatest,
    onLinkPress,
    onCopyCode,
    onMessageAction,
    renderMessage,
    contentRenderers,
    markdownElementRenderers,
    markdownRenderer,
    renderSend,
    renderStop,
    renderScrollToLatest,
    renderComposerControls,
    messageActions,
    icons,
    disabled,
    readOnly,
    capabilities,
    followThreshold,
    loadEarlierLabel,
    scrollToLatestLabel,
    sendLabel,
    stopLabel,
    placeholder,
    maxHeight,
    minHeight,
    blurBehavior,
    dismissKeyboardOnSend,
    onAtBottomChange,
    onUnreadCountChange,
    onVisibleRangeChange,
    styleOverrides,
    renderEmptyState,
    renderLoadingState,
    renderTypingState,
    renderErrorState,
  } = props

  // Disabled/read-only and a disabled actions capability hide the action
  // affordance entirely (FR-014). A disabled copy capability hides the copy
  // control on code blocks (the control only renders when onCopyCode is set).
  const effectiveActions =
    disabled || readOnly || capabilities?.actions === false ? undefined : messageActions
  const effectiveOnCopyCode =
    disabled || readOnly || capabilities?.copy === false ? undefined : onCopyCode

  const defaultRenderMessage = useCallback(
    (message: Message) => (
      <MessageBubble
        message={message}
        onLinkPress={onLinkPress}
        onCopyCode={effectiveOnCopyCode}
        messageActions={effectiveActions}
        onMessageAction={onMessageAction}
        contentRenderers={contentRenderers}
        markdownElementRenderers={markdownElementRenderers}
        markdownRenderer={markdownRenderer}
        icons={icons}
        styleOverrides={styleOverrides}
      />
    ),
    [
      onLinkPress,
      effectiveOnCopyCode,
      effectiveActions,
      onMessageAction,
      contentRenderers,
      markdownElementRenderers,
      markdownRenderer,
      icons,
      styleOverrides,
    ],
  )

  // A guaranteed-safe fallback: the default message bubble without any
  // host-supplied renderers, so a throwing custom renderer cannot re-throw
  // through the fallback path (FR-011). Capability gating matches the primary
  // path (copy control hidden when the copy capability is off).
  const safeFallback = useCallback(
    (message: Message) => (
      <MessageBubble
        message={message}
        onLinkPress={onLinkPress}
        onCopyCode={effectiveOnCopyCode}
        styleOverrides={styleOverrides}
      />
    ),
    [onLinkPress, effectiveOnCopyCode, styleOverrides],
  )

  // Every row renders through a per-message boundary. The effective renderer
  // (custom if provided, else the default MessageBubble) is the primary; a
  // throw falls back to the safe default bubble for that message only.
  const boundedRenderMessage = useCallback(
    (message: Message) => {
      const effectiveRenderer = renderMessage ?? defaultRenderMessage
      return (
        <MessageRendererBoundary
          key={message.id}
          message={message}
          renderMessage={(m) => effectiveRenderer(m)}
          renderFallback={safeFallback}
        />
      )
    },
    [renderMessage, defaultRenderMessage, safeFallback],
  )

  const listProps: MessageListProps = {
    messages,
    hasEarlierMessages,
    isLoadingEarlier,
    renderMessage: boundedRenderMessage,
    followThreshold,
    loadEarlierLabel,
    scrollToLatestLabel,
    renderScrollToLatest,
    onLoadEarlier,
    onScrollToLatest,
    onAtBottomChange,
    onUnreadCountChange,
    onVisibleRangeChange,
    icons,
    styleOverrides,
  }

  const composerProps: ComposerProps = {
    value: draft,
    canSend: draft.trim().length > 0,
    isBusy: status === 'submitting' || status === 'streaming' || status === 'stopping',
    onChangeText: onChangeDraft,
    onSubmit,
    onStop,
    maxHeight,
    minHeight,
    blurBehavior,
    dismissKeyboardOnSend,
    placeholder,
    sendLabel,
    stopLabel,
    renderSend,
    renderStop,
    renderComposerControls,
    disabled,
    readOnly,
    capabilities,
    icons,
    styleOverrides,
  }

  const stateKind = stateKindFor(status, messages)
  const stateView = (() => {
    switch (stateKind) {
      case 'empty':
        return renderEmptyState ? (
          renderEmptyState()
        ) : (
          <EmptyState styleOverrides={styleOverrides} />
        )
      case 'loading':
        return renderLoadingState ? (
          renderLoadingState()
        ) : (
          <LoadingState styleOverrides={styleOverrides} />
        )
      case 'typing':
        return renderTypingState ? (
          renderTypingState()
        ) : (
          <TypingState styleOverrides={styleOverrides} />
        )
      case 'error':
        return renderErrorState ? (
          renderErrorState()
        ) : (
          <ErrorState styleOverrides={styleOverrides} />
        )
      default:
        return null
    }
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="chat.root">
      {stateView ?? <MessageList {...listProps} />}
      <Composer {...composerProps} />
    </View>
  )
}

export function Chat(props: ChatProps) {
  return (
    <ThemeProvider
      themeName={props.theme}
      themeOverride={props.themeOverride}
      styleOverrides={props.styleOverrides}
    >
      <ChatInner {...props} />
    </ThemeProvider>
  )
}
