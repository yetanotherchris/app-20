import { createRoot } from 'react-dom/client'
import { ChatDemo } from '@app-20/chat-demo'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<ChatDemo />)
}
