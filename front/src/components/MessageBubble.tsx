import { RespostaDisplay } from './RespostaDisplay'
import { WeatherCard } from './WeatherCard'
import { FontesChips } from './FontesChips'
import './MessageBubble.css'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  onReenviar?: (() => void) | undefined
}

export function MessageBubble({ message, onReenviar }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`bubble bubble--${message.role}`} aria-label={isUser ? 'Sua pergunta' : 'Resposta do assistente'}>
      {isUser ? (
        <p className="bubble__user-text">{message.content}</p>
      ) : (
        <div className="bubble__assistant-body">
          {message.loading ? (
            <span className="bubble__dots" aria-label="Carregando resposta">
              <span />
              <span />
              <span />
            </span>
          ) : message.erro !== null ? (
            <div className="bubble__erro-container">
              <p className="bubble__erro">{message.erro}</p>
              {onReenviar !== undefined && (
                <button
                  className="bubble__reenviar"
                  onClick={onReenviar}
                  type="button"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <>
              <RespostaDisplay content={message.content} />
              <WeatherCard visivel={message.mcpInvocados.includes('mcp-clima')} />
              <FontesChips fontes={message.fontes} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
