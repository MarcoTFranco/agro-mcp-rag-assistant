import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { Message, RespostaConsulta } from '../types'

const GATEWAY_URL = 'http://localhost:9090/consulta'

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
  const abortRef = useRef<AbortController | null>(null)
  const ultimaPerguntaRef = useRef<string>('')
  const loadingRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const enviar = useCallback((pergunta: string) => {
    if (loadingRef.current) return

    ultimaPerguntaRef.current = pergunta
    abortRef.current?.abort()

    const historico = messages
      .filter(m => m.content.length > 0)
      .map(m => ({ role: m.role, content: m.content }))

    const ctrl = new AbortController()
    abortRef.current = ctrl
    loadingRef.current = true

    const timeoutId = window.setTimeout(() => {
      ctrl.abort()
      setMessages(prev =>
        prev.map(m =>
          m.id === idAssistente && m.loading
            ? { ...m, loading: false, erro: 'O servidor demorou demais para responder. Tente novamente.' }
            : m
        )
      )
      loadingRef.current = false
      setLoading(false)
    }, 30_000)

    const msgUsuario: Message = {
      id: gerarId(),
      role: 'user',
      content: pergunta,
      fontes: [],
      mcpInvocados: [],
      clima: null,
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
      clima: null,
      erro: null,
      loading: true,
    }

    setMessages(prev => [...prev, msgUsuario, msgAssistente])
    setLoading(true)

    const concluir = () => {
      clearTimeout(timeoutId)
      loadingRef.current = false
      setLoading(false)
    }

    fetchEventSource(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta, historico }),
      signal: ctrl.signal,
      openWhenHidden: true,

      onmessage(event) {
        if (event.event === 'resposta') {
          let data: RespostaConsulta
          try {
            data = JSON.parse(event.data) as RespostaConsulta
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
                    clima: data.clima ?? null,
                    loading: false,
                    erro: null,
                  }
                : m
            )
          )
          concluir()
        }
      },

      onerror(err) {
        // Erros de cliente (4xx) são fatais — encerra sem retry
        if (err instanceof Error && 'status' in err && typeof (err as {status: number}).status === 'number') {
          const status = (err as {status: number}).status
          if (status >= 400 && status < 500) throw err
        }
        // Demais erros (rede, 5xx): fetchEventSource retenta automaticamente
        // O timeout de 30s acima garante que não fica tentando para sempre
      },

      onclose() {
        setMessages(prev =>
          prev.map(m =>
            m.id === idAssistente && m.loading
              ? { ...m, loading: false, erro: 'O servidor encerrou a conexão sem responder.' }
              : m
          )
        )
        concluir()
      },
    }).catch(err => {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev =>
        prev.map(m =>
          m.id === idAssistente && m.loading
            ? { ...m, loading: false, erro: 'Erro de conexão com o servidor. Verifique se o Gateway está ativo.' }
            : m
        )
      )
      concluir()
    })
  }, [messages])

  const reenviar = useCallback(() => {
    if (ultimaPerguntaRef.current.length > 0) {
      enviar(ultimaPerguntaRef.current)
    }
  }, [enviar])

  return { loading, messages, enviar, reenviar }
}
