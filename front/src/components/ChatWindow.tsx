import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from './EmptyState'
import './ChatWindow.css'
import type { Message } from '../types'

interface ChatWindowProps {
  messages: Message[]
  onSugestao: (pergunta: string) => void
  onReenviar: () => void
}

export function ChatWindow({ messages, onSugestao, onReenviar }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const ultimaMensagem = messages[messages.length - 1]

  return (
    <main
      className="chat-window"
      aria-live="polite"
      aria-label="Conversa com o assistente"
    >
      {messages.length === 0 ? (
        <EmptyState onSugestao={onSugestao} />
      ) : (
        <div className="chat-window__messages">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReenviar={
                msg.id === ultimaMensagem?.id && msg.erro !== null
                  ? onReenviar
                  : undefined
              }
            />
          ))}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      )}
    </main>
  )
}
