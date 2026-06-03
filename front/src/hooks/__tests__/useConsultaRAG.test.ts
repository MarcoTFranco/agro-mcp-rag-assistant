import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConsultaRAG } from '../useConsultaRAG'

class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  close() {
    this.closed = true
  }

  emit(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitError() {
    this.onerror?.(new Event('error'))
  }
}

beforeEach(() => {
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useConsultaRAG', () => {
  it('inicia com estado vazio', () => {
    const { result } = renderHook(() => useConsultaRAG())
    expect(result.current.loading).toBe(false)
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.erro).toBeNull()
  })

  it('adiciona mensagem do usuário e abre SSE ao enviar', () => {
    const { result } = renderHook(() => useConsultaRAG())

    act(() => {
      result.current.enviar('como tratar lagarta?')
    })

    expect(result.current.messages[0]?.role).toBe('user')
    expect(result.current.messages[0]?.content).toBe('como tratar lagarta?')
    expect(result.current.loading).toBe(true)
    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0]?.url).toContain('como%20tratar%20lagarta%3F')
  })

  it('preenche a resposta do assistente ao receber evento SSE', () => {
    const { result } = renderHook(() => useConsultaRAG())

    act(() => {
      result.current.enviar('teste')
    })

    const source = MockEventSource.instances[0]!
    act(() => {
      source.emit(JSON.stringify({
        resposta: 'Use inseticida X',
        fontes: ['bula-inseticida.pdf'],
        mcp_invocados: [],
      }))
    })

    const assistantMsg = result.current.messages[1]
    expect(assistantMsg?.role).toBe('assistant')
    expect(assistantMsg?.content).toBe('Use inseticida X')
    expect(assistantMsg?.fontes).toEqual(['bula-inseticida.pdf'])
    expect(assistantMsg?.loading).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(source.closed).toBe(true)
  })

  it('marca erro na bolha quando SSE falha', () => {
    const { result } = renderHook(() => useConsultaRAG())

    act(() => {
      result.current.enviar('teste')
    })

    const source = MockEventSource.instances[0]!
    act(() => {
      source.emitError()
    })

    const assistantMsg = result.current.messages[1]
    expect(assistantMsg?.erro).toBe('Não foi possível conectar ao servidor. Tente novamente.')
    expect(assistantMsg?.loading).toBe(false)
    expect(source.closed).toBe(true)
  })

  it('detecta mcp_invocados com "mcp-clima"', () => {
    const { result } = renderHook(() => useConsultaRAG())

    act(() => {
      result.current.enviar('pode aplicar hoje com chuva?')
    })

    const source = MockEventSource.instances[0]!
    act(() => {
      source.emit(JSON.stringify({
        resposta: 'Não recomendado com chuva.',
        fontes: [],
        mcp_invocados: ['mcp-clima'],
      }))
    })

    const assistantMsg = result.current.messages[1]
    expect(assistantMsg?.mcpInvocados).toContain('mcp-clima')
  })
})
