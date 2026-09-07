import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  LegendList,
  type LegendListRef,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type OnViewableItemsChangedInfo,
} from '@legendapp/list/react-native'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import type { Message, VisibleRange } from '../types'
import { useAtBottom } from '../hooks/useAtBottom'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { LoadEarlierControl } from './LoadEarlierControl'
import { ScrollToLatestControl } from './ScrollToLatestControl'
import { UnreadBadge } from './UnreadBadge'

export interface MessageListProps {
  messages: readonly Message[]
  hasEarlierMessages: boolean
  isLoadingEarlier: boolean
  renderMessage: (message: Message) => React.ReactElement
  followThreshold?: number
  loadEarlierLabel?: string
  scrollToLatestLabel?: string
  onLoadEarlier: () => void
  onScrollToLatest?: () => void
  onAtBottomChange?: (isAtBottom: boolean) => void
  onUnreadCountChange?: (count: number) => void
  onVisibleRangeChange?: (range: VisibleRange) => void
}

const DEFAULT_FOLLOW_THRESHOLD = 96

export function MessageList({
  messages,
  hasEarlierMessages,
  isLoadingEarlier,
  renderMessage,
  followThreshold = DEFAULT_FOLLOW_THRESHOLD,
  loadEarlierLabel = 'Load earlier messages',
  scrollToLatestLabel = 'Scroll to latest',
  onLoadEarlier,
  onScrollToLatest,
  onAtBottomChange,
  onUnreadCountChange,
  onVisibleRangeChange,
}: MessageListProps) {
  const listRef = useRef<LegendListRef>(null)
  const viewportHeightRef = useRef(0)
  const contentHeightRef = useRef(0)
  const onVisibleRangeChangeRef = useRef(onVisibleRangeChange)
  onVisibleRangeChangeRef.current = onVisibleRangeChange

  const { isAtBottom, update } = useAtBottom(followThreshold, onAtBottomChange)
  const { unreadCount, clearUnread } = useUnreadCount(isAtBottom, messages.length)
  const onUnreadCountChangeRef = useRef(onUnreadCountChange)
  onUnreadCountChangeRef.current = onUnreadCountChange

  useEffect(() => {
    onUnreadCountChangeRef.current?.(unreadCount)
  }, [unreadCount])

  const scrollToLatest = useCallback(() => {
    void listRef.current?.scrollToOffset({ offset: contentHeightRef.current, animated: true })
    clearUnread()
    onScrollToLatest?.()
  }, [clearUnread, onScrollToLatest])

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize } = event.nativeEvent
      contentHeightRef.current = contentSize.height
      update({
        contentHeight: contentSize.height,
        offsetY: contentOffset.y,
        viewportHeight: viewportHeightRef.current,
      })
    },
    [update],
  )

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    contentHeightRef.current = height
  }, [])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: Message }) => renderMessage(item),
    [renderMessage],
  )

  const keyExtractor = useCallback((item: Message) => item.id, [])

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), [])

  const onViewableItemsChanged = useCallback((info: OnViewableItemsChangedInfo<Message>) => {
    const indexes = info.viewableItems
      .map((token) => token.index)
      .filter((index): index is number => typeof index === 'number')
    if (indexes.length === 0) return
    onVisibleRangeChangeRef.current?.({
      firstIndex: Math.min(...indexes),
      lastIndex: Math.max(...indexes),
    })
  }, [])

  const loadEarlierControl =
    hasEarlierMessages || isLoadingEarlier ? (
      <LoadEarlierControl
        label={loadEarlierLabel}
        isLoading={isLoadingEarlier}
        onPress={onLoadEarlier}
      />
    ) : null

  return (
    <View style={styles.container} onLayout={handleLayout} testID="chat.message-list">
      <LegendList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollAtEnd
        maintainScrollAtEnd
        maintainScrollAtEndThreshold={0.2}
        maintainVisibleContentPosition={false}
        ListHeaderComponent={loadEarlierControl}
      />
      {!isAtBottom && (
        <View style={styles.overlay}>
          {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
          <ScrollToLatestControl label={scrollToLatestLabel} onPress={scrollToLatest} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    gap: 8,
  },
})
