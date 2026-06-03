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
  const messageCount = messages.length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageCount])

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
          {messages.map(msg => {
            const isLastWithError = msg.id === ultimaMensagem?.id && msg.erro !== null
            return isLastWithError ? (
              <MessageBubble key={msg.id} message={msg} onReenviar={onReenviar} />
            ) : (
              <MessageBubble key={msg.id} message={msg} />
            )
          })}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      )}
    </main>
  )
}
