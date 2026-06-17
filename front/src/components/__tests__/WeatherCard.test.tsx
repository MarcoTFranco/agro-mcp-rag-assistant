import { render, screen } from '@testing-library/react'
import { WeatherCard } from '../WeatherCard'
import type { ClimaResponse } from '../../types'

const mockClima: ClimaResponse = {
  disponivel: true,
  cidade: 'Campinas',
  temperatura_c: 24,
  sensacao_termica_c: 22,
  umidade_pct: 65,
  vento_kmh: 12,
  descricao: 'Parcialmente nublado',
  nuvens_pct: 20,
}

describe('WeatherCard', () => {
  it('renders nothing when visivel is false', () => {
    const { container } = render(<WeatherCard visivel={false} clima={mockClima} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when clima is null', () => {
    const { container } = render(<WeatherCard visivel={true} clima={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders city name', () => {
    render(<WeatherCard visivel={true} clima={mockClima} />)
    expect(screen.getByText('Campinas')).toBeInTheDocument()
  })

  it('renders temperature', () => {
    render(<WeatherCard visivel={true} clima={mockClima} />)
    expect(screen.getByText('24°C')).toBeInTheDocument()
  })

  it('renders all four metrics', () => {
    render(<WeatherCard visivel={true} clima={mockClima} />)
    expect(screen.getByText('65%')).toBeInTheDocument()   // umidade
    expect(screen.getByText('12 km/h')).toBeInTheDocument() // vento
    expect(screen.getByText('20%')).toBeInTheDocument()   // nuvens
    expect(screen.getByText('22°C')).toBeInTheDocument()  // sensação
  })

  it('renders description', () => {
    render(<WeatherCard visivel={true} clima={mockClima} />)
    expect(screen.getByText('Parcialmente nublado')).toBeInTheDocument()
  })
})
