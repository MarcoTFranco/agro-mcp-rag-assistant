import { useState, useRef, type KeyboardEvent } from 'react'
import './ChatInput.css'

interface ChatInputProps {
  onEnviar: (pergunta: string) => void
  disabled: boolean
}

export function ChatInput({ onEnviar, disabled }: ChatInputProps) {
  const [valor, setValor] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleEnviar() {
    const texto = valor.trim()
    if (texto.length === 0 || disabled) return
    onEnviar(texto)
    setValor('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  return (
    <div className="chat-input">
      <div className="chat-input__inner">
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Faça uma pergunta sobre manejo de pragas..."
          aria-label="Campo de pergunta"
        />
        <button
          className="chat-input__btn"
          onClick={handleEnviar}
          disabled={disabled || valor.trim().length === 0}
          type="button"
          aria-label="Enviar pergunta"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
      <p className="chat-input__hint">Enter para enviar · Shift+Enter para nova linha</p>
    </div>
  )
}
