import { render, screen } from '@testing-library/react'
import { RespostaDisplay } from '../RespostaDisplay'

describe('RespostaDisplay', () => {
  it('renders markdown bold as <strong>', () => {
    render(<RespostaDisplay content="**negrito**" />)
    const el = screen.getByText('negrito')
    expect(el.tagName).toBe('STRONG')
  })

  it('renders ordered list items', () => {
    render(<RespostaDisplay content={'1. primeiro\n2. segundo'} />)
    expect(screen.getByText('primeiro')).toBeInTheDocument()
    expect(screen.getByText('segundo')).toBeInTheDocument()
  })

  it('renders italic as <em>', () => {
    render(<RespostaDisplay content="*itálico*" />)
    const el = screen.getByText('itálico')
    expect(el.tagName).toBe('EM')
  })

  it('applies resposta-display class to wrapper', () => {
    const { container } = render(<RespostaDisplay content="texto" />)
    expect(container.firstChild).toHaveClass('resposta-display')
  })
})
