import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, RespostaConsulta } from '../types'

function gerarId(): string {
  return crypto.randomUUID()
}

interface UseConsultaRAGReturn {
  loading: boolean
  messages: Message[]
  enviar: (pergunta: string) => void
  reenviar: () => void
}

export function useConsultaRAG(): UseConsultaRAGReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const ultimaPerguntaRef = useRef<string>('')
  const loadingRef = useRef(false)

  useEffect(() => {
    return () => {
      sourceRef.current?.close()
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  const enviar = useCallback((pergunta: string) => {
    if (loadingRef.current) return

    ultimaPerguntaRef.current = pergunta
    sourceRef.current?.close()
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
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
      timeoutRef.current = null
      setLoading(false)
    }

    timeoutRef.current = window.setTimeout(() => {
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

    // Captura eventos sem nome. Se o Gateway usar named events (ex: event: resultado),
    // substituir por source.addEventListener('resultado', handler)
    source.onmessage = (event: MessageEvent) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
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
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
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

  return { loading, messages, enviar, reenviar }
}
