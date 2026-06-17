import { render, screen } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import type { Message } from '../../types'

const baseMsg: Message = {
  id: '1',
  role: 'assistant',
  content: 'Resposta de teste',
  fontes: [],
  mcpInvocados: [],
  clima: null,
  erro: null,
  loading: false,
}

describe('MessageBubble', () => {
  it('renders markdown bold in assistant response', () => {
    const msg = { ...baseMsg, content: '**negrito**' }
    render(<MessageBubble message={msg} />)
    expect(screen.getByText('negrito').tagName).toBe('STRONG')
  })

  it('does not render footer toggle when no fontes and no clima', () => {
    render(<MessageBubble message={baseMsg} />)
    expect(screen.queryByRole('button', { name: /Ver detalhes/i })).not.toBeInTheDocument()
  })

  it('renders footer toggle when fontes exist', () => {
    const msg = {
      ...baseMsg,
      fontes: [{ titulo: 'Embrapa', trecho: 'trecho', pagina: 1 }],
    }
    render(<MessageBubble message={msg} />)
    expect(screen.getByRole('button', { name: /Ver detalhes/i })).toBeInTheDocument()
  })

  it('renders footer toggle when clima exists and get_weather was invoked', () => {
    const msg = {
      ...baseMsg,
      mcpInvocados: ['get_weather'],
      clima: {
        disponivel: true,
        cidade: 'Campinas',
        temperatura_c: 24,
        sensacao_termica_c: 22,
        umidade_pct: 65,
        vento_kmh: 12,
        descricao: 'Ensolarado',
        nuvens_pct: 10,
      },
    }
    render(<MessageBubble message={msg} />)
    expect(screen.getByRole('button', { name: /Ver detalhes/i })).toBeInTheDocument()
  })

  it('renders loading dots when loading', () => {
    const msg = { ...baseMsg, loading: true }
    render(<MessageBubble message={msg} />)
    expect(screen.getByLabelText('Carregando resposta')).toBeInTheDocument()
  })

  it('renders error and retry button', () => {
    const msg = { ...baseMsg, erro: 'Falha na conexão' }
    const onReenviar = vi.fn()
    render(<MessageBubble message={msg} onReenviar={onReenviar} />)
    expect(screen.getByText('Falha na conexão')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('renders user message as plain text', () => {
    const msg = { ...baseMsg, role: 'user' as const, content: 'minha pergunta' }
    render(<MessageBubble message={msg} />)
    expect(screen.getByText('minha pergunta')).toBeInTheDocument()
  })
})
