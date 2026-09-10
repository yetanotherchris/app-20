import { createRoot } from 'react-dom/client'
import { ChatDemo } from '@app-20/chat-demo'
import { App } from './App'

const surface = new URLSearchParams(window.location.search).get('surface')
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(surface === 'demo' ? <ChatDemo /> : <App />)
}
