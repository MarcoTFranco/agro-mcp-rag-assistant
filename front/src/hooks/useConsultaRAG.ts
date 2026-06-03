import { useState, useCallback, useRef } from 'react'
import type { Message, RespostaConsulta } from '../types'

function gerarId(): string {
  return Math.random().toString(36).slice(2)
}

interface UseConsultaRAGReturn {
  loading: boolean
  messages: Message[]
  erro: string | null
  enviar: (pergunta: string) => void
  reenviar: () => void
}

export function useConsultaRAG(): UseConsultaRAGReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)
  const ultimaPerguntaRef = useRef<string>('')
  const loadingRef = useRef(false)

  const enviar = useCallback((pergunta: string) => {
    if (loadingRef.current) return

    ultimaPerguntaRef.current = pergunta
    sourceRef.current?.close()
    setErro(null)
    loadingRef.current = true

    const msgUsuario: Message = {
      id: gerarId(),
      role: 'user',
      content: pergunta,
      fontes: [],
      mcpInvocados: [],
      erro: null,
      loading: false,
    }

    const idAssistente = gerarId()
    const msgAssistente: Message = {
      id: idAssistente,
      role: 'assistant',
      content: '',
      fontes: [],
      mcpInvocados: [],
      erro: null,
      loading: true,
    }

    setMessages(prev => [...prev, msgUsuario, msgAssistente])
    setLoading(true)

    const url = `/api/consulta?pergunta=${encodeURIComponent(pergunta)}`
    const source = new EventSource(url)
    sourceRef.current = source

    const concluir = () => {
      loadingRef.current = false
      setLoading(false)
    }

    const timeout = window.setTimeout(() => {
      source.close()
      setMessages(prev =>
        prev.map(m =>
          m.id === idAssistente
            ? { ...m, loading: false, erro: 'O servidor demorou demais para responder.' }
            : m
        )
      )
      concluir()
    }, 30_000)

    source.onmessage = (event: MessageEvent) => {
      clearTimeout(timeout)
      source.close()

      let data: RespostaConsulta
      try {
        data = JSON.parse(event.data as string) as RespostaConsulta
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === idAssistente
              ? { ...m, loading: false, erro: 'Resposta inesperada do servidor.' }
              : m
          )
        )
        concluir()
        return
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === idAssistente
            ? {
                ...m,
                content: data.resposta,
                fontes: data.fontes,
                mcpInvocados: data.mcp_invocados,
                loading: false,
                erro: null,
              }
            : m
        )
      )
      concluir()
    }

    source.onerror = () => {
      clearTimeout(timeout)
      source.close()
      setMessages(prev =>
        prev.map(m =>
          m.id === idAssistente
            ? {
                ...m,
                loading: false,
                erro: 'Não foi possível conectar ao servidor. Tente novamente.',
              }
            : m
        )
      )
      concluir()
    }
  }, [])

  const reenviar = useCallback(() => {
    if (ultimaPerguntaRef.current.length > 0) {
      enviar(ultimaPerguntaRef.current)
    }
  }, [enviar])

  return { loading, messages, erro, enviar, reenviar }
}
