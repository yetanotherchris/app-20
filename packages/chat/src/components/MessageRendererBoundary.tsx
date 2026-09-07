import { Component, type ReactNode } from 'react'
import type { Message } from '../types'

export interface MessageRendererBoundaryProps {
  message: Message
  renderMessage: (message: Message) => ReactNode
  renderFallback: (message: Message) => ReactNode
}

interface MessageRendererBoundaryState {
  failed: boolean
}

/**
 * A function component child so a renderer throw happens in the boundary's
 * subtree, not in the boundary's own render (which an error boundary cannot
 * catch).
 */
function BoundaryContent({
  message,
  renderMessage,
}: Pick<MessageRendererBoundaryProps, 'message' | 'renderMessage'>): ReactNode {
  return renderMessage(message)
}

/**
 * Per-message error boundary. If the host's renderer throws while rendering
 * this message, the boundary for that row catches it and renders the default
 * renderer for the same message; other rows are unaffected (FR-011).
 */
export class MessageRendererBoundary extends Component<
  MessageRendererBoundaryProps,
  MessageRendererBoundaryState
> {
  override state: MessageRendererBoundaryState = { failed: false }

  static getDerivedStateFromError(): MessageRendererBoundaryState {
    return { failed: true }
  }

  override componentDidUpdate(prevProps: MessageRendererBoundaryProps): void {
    // A new message id resets the boundary so a previously failed renderer
    // gets a fresh chance for a different message.
    if (prevProps.message.id !== this.props.message.id && this.state.failed) {
      this.setState({ failed: false })
    }
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return this.props.renderFallback(this.props.message)
    }
    return (
      <BoundaryContent message={this.props.message} renderMessage={this.props.renderMessage} />
    )
  }
}