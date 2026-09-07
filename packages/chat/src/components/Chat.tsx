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
  if (status === 'error') return 'error'
  if (status === 'submitting') return 'loading'
  if (status === 'streaming') return 'typing'
  if (messages.length === 0) return 'empty'
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

  const defaultRenderMessage = useCallback(
    (message: Message) => {
      // Disabled/read-only and a disabled actions capability hide the action
      // affordance entirely (FR-014).
      const effectiveActions =
        disabled || readOnly || capabilities?.actions === false ? undefined : messageActions
      return (
        <MessageRendererBoundary
          key={message.id}
          message={message}
          renderMessage={(m) => (
            <MessageBubble
              message={m}
              onLinkPress={onLinkPress}
              onCopyCode={onCopyCode}
              messageActions={effectiveActions}
              onMessageAction={onMessageAction}
              contentRenderers={contentRenderers}
              markdownElementRenderers={markdownElementRenderers}
              markdownRenderer={markdownRenderer}
              icons={icons}
              styleOverrides={styleOverrides}
            />
          )}
          renderFallback={(m) => (
            <MessageBubble
              message={m}
              onLinkPress={onLinkPress}
              onCopyCode={onCopyCode}
              messageActions={effectiveActions}
              onMessageAction={onMessageAction}
              contentRenderers={contentRenderers}
              markdownElementRenderers={markdownElementRenderers}
              markdownRenderer={markdownRenderer}
              icons={icons}
              styleOverrides={styleOverrides}
            />
          )}
        />
      )
    },
    [
      disabled,
      readOnly,
      capabilities,
      onLinkPress,
      onCopyCode,
      messageActions,
      onMessageAction,
      contentRenderers,
      markdownElementRenderers,
      markdownRenderer,
      icons,
      styleOverrides,
    ],
  )

  const listProps: MessageListProps = {
    messages,
    hasEarlierMessages,
    isLoadingEarlier,
    renderMessage: renderMessage ?? defaultRenderMessage,
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
        return renderEmptyState ? renderEmptyState() : <EmptyState />
      case 'loading':
        return renderLoadingState ? renderLoadingState() : <LoadingState />
      case 'typing':
        return renderTypingState ? renderTypingState() : <TypingState />
      case 'error':
        return renderErrorState ? renderErrorState() : <ErrorState />
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