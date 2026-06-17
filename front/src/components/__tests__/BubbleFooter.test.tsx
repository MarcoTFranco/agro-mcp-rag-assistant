import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BubbleFooter } from '../BubbleFooter'
import type { FonteResponse, ClimaResponse } from '../../types'

const mockFontes: FonteResponse[] = [
  { titulo: 'Embrapa Milho', trecho: 'Trecho exemplo', pagina: 1 },
]

const mockClima: ClimaResponse = {
  disponivel: true,
  cidade: 'Campinas',
  temperatura_c: 24,
  sensacao_termica_c: 22,
  umidade_pct: 65,
  vento_kmh: 12,
  descricao: 'Ensolarado',
  nuvens_pct: 10,
}

describe('BubbleFooter', () => {
  it('renders nothing when no fontes and no clima', () => {
    const { container } = render(
      <BubbleFooter fontes={[]} mcpInvocados={[]} clima={null} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders "1 fonte" singular label', () => {
    render(<BubbleFooter fontes={mockFontes} mcpInvocados={[]} clima={null} />)
    expect(screen.getByText(/1 fonte/)).toBeInTheDocument()
  })

  it('renders "N fontes" plural label for multiple sources', () => {
    const twoFontes = [mockFontes[0], { ...mockFontes[0], titulo: 'Outro' }]
    render(<BubbleFooter fontes={twoFontes} mcpInvocados={[]} clima={null} />)
    expect(screen.getByText(/2 fontes/)).toBeInTheDocument()
  })

  it('renders clima label when get_weather is invoked and clima exists', () => {
    render(
      <BubbleFooter fontes={[]} mcpInvocados={['get_weather']} clima={mockClima} />
    )
    expect(screen.getByText(/Clima consultado/)).toBeInTheDocument()
  })

  it('does not render clima label when clima is null', () => {
    render(
      <BubbleFooter fontes={[]} mcpInvocados={['get_weather']} clima={null} />
    )
    expect(screen.queryByText(/Clima consultado/)).not.toBeInTheDocument()
  })

  it('content is hidden by default', () => {
    render(<BubbleFooter fontes={mockFontes} mcpInvocados={[]} clima={null} />)
    expect(screen.queryByText('Embrapa Milho')).not.toBeInTheDocument()
  })

  it('expands to show fontes and clima on toggle click', async () => {
    const user = userEvent.setup()
    render(
      <BubbleFooter fontes={mockFontes} mcpInvocados={['get_weather']} clima={mockClima} />
    )

    await user.click(screen.getByRole('button', { name: /Ver detalhes/i }))

    expect(screen.getByText('Embrapa Milho')).toBeInTheDocument()
    expect(screen.getByText('Campinas')).toBeInTheDocument()
  })

  it('collapses on second toggle click', async () => {
    const user = userEvent.setup()
    render(<BubbleFooter fontes={mockFontes} mcpInvocados={[]} clima={null} />)

    await user.click(screen.getByRole('button', { name: /Ver detalhes/i }))
    expect(screen.getByText('Embrapa Milho')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ocultar detalhes/i }))
    expect(screen.queryByText('Embrapa Milho')).not.toBeInTheDocument()
  })
})
