import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MessageList } from './MessageList'
import type { Message } from '../types'

vi.mock('@legendapp/list/react-native', () => ({
  LegendList: ({
    data,
    renderItem,
    ListHeaderComponent,
  }: {
    data: readonly Message[]
    renderItem: (info: { item: Message }) => React.ReactElement
    ListHeaderComponent?: React.ReactElement | null
  }) => (
    <div>
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
})
