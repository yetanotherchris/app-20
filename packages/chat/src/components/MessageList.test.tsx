import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MessageList } from './MessageList'
import type { Message } from '../types'

vi.mock('@legendapp/list/react-native', () => ({
  LegendList: ({
    data,
    renderItem,
    ListHeaderComponent,
    onScroll,
    onLayout,
    extraData,
  }: {
    data: readonly Message[]
    renderItem: (info: { item: Message }) => React.ReactElement
    ListHeaderComponent?: React.ReactElement | null
    onScroll?: (event: {
      nativeEvent: { contentOffset: { y: number }; contentSize: { height: number } }
    }) => void
    onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void
    extraData?: unknown
  }) => (
    <div
      data-testid="mock-legend-list"
      data-extradata={String(extraData != null)}
      ref={(node) => {
        if (node) onLayout?.({ nativeEvent: { layout: { height: 600 } } })
      }}
      onScroll={() => {
        onScroll?.({
          nativeEvent: {
            contentOffset: { y: 500 },
            contentSize: { height: 1200 },
          },
        })
      }}
    >
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

const messages = [message('a'), message('b', 'user'), message('c')]

function renderMessage(msg: Message): React.ReactElement {
  return (
    <div key={msg.id} data-testid={`chat.message.${msg.id}`}>
      {msg.contentParts[0]?.text}
    </div>
  )
}

describe('MessageList', () => {
  it('renders each message through the host renderMessage', () => {
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        renderMessage={renderMessage}
        onLoadEarlier={() => {}}
      />,
    )
    for (const msg of messages) {
      expect(screen.getByTestId(`chat.message.${msg.id}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('chat.message-list')).toBeInTheDocument()
  })

  it('shows the load-earlier control when earlier messages exist and fires onLoadEarlier', () => {
    const onLoadEarlier = vi.fn()
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={true}
        isLoadingEarlier={false}
        renderMessage={renderMessage}
        onLoadEarlier={onLoadEarlier}
      />,
    )
    const control = screen.getByTestId('chat.load-earlier')
    expect(control).toBeInTheDocument()
    fireEvent.click(control)
    expect(onLoadEarlier).toHaveBeenCalledTimes(1)
  })

  it('disables the load-earlier control while a load is in flight', () => {
    const onLoadEarlier = vi.fn()
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={true}
        isLoadingEarlier={true}
        renderMessage={renderMessage}
        onLoadEarlier={onLoadEarlier}
      />,
    )
    const control = screen.getByTestId('chat.load-earlier')
    expect(control).toBeDisabled()
    fireEvent.click(control)
    expect(onLoadEarlier).not.toHaveBeenCalled()
  })

  it('hides the load-earlier control when no earlier messages exist', () => {
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        renderMessage={renderMessage}
        onLoadEarlier={() => {}}
      />,
    )
    expect(screen.queryByTestId('chat.load-earlier')).not.toBeInTheDocument()
  })

  it('shows the scroll-to-latest overlay only when scrolled up', () => {
    const onAtBottomChange = vi.fn()
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        renderMessage={renderMessage}
        onLoadEarlier={() => {}}
        onAtBottomChange={onAtBottomChange}
      />,
    )
    // Starts at the bottom: no overlay.
    expect(screen.queryByTestId('chat.scroll-to-latest')).not.toBeInTheDocument()
    // Simulate scrolling up: contentHeight 1200, offsetY 500, viewport 600
    // puts distanceFromBottom at 100, beyond the 96 px threshold.
    fireEvent.scroll(screen.getByTestId('mock-legend-list'))
    expect(screen.getByTestId('chat.scroll-to-latest')).toBeInTheDocument()
    expect(onAtBottomChange).toHaveBeenLastCalledWith(false)
  })

  it('renders a custom scroll-to-latest control in place of the default (FR-007)', () => {
    render(
      <MessageList
        messages={messages}
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        renderMessage={renderMessage}
        onLoadEarlier={() => {}}
        renderScrollToLatest={() => <div data-testid="custom-scroll" />}
      />,
    )
    fireEvent.scroll(screen.getByTestId('mock-legend-list'))
    expect(screen.getByTestId('custom-scroll')).toBeInTheDocument()
    expect(screen.queryByTestId('chat.scroll-to-latest')).not.toBeInTheDocument()
  })
})
