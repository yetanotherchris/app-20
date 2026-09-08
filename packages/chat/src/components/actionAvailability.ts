import type { MessageAction } from '../theme/types'
import type { Message } from '../types'

/** Per-message action availability, shared by the inline row and the menu. */
export function filterAvailableActions(
  actions: readonly MessageAction[],
  message: Message,
): MessageAction[] {
  return actions.filter((action) => {
    if (typeof action.available === 'function') return action.available(message)
    return action.available !== false
  })
}
