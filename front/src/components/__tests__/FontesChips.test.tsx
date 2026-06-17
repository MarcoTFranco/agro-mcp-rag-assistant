import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FontesChips } from '../FontesChips'
import type { FonteResponse } from '../../types'

const mockFontes: FonteResponse[] = [
  { titulo: 'Embrapa Milho', trecho: 'Controle integrado de pragas...', pagina: 34 },
  { titulo: 'Guia MIP 2023', trecho: 'Nível de controle recomendado...', pagina: 12 },
]

describe('FontesChips', () => {
  it('renders nothing when fontes is empty', () => {
    const { container } = render(<FontesChips fontes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders chip title as button', () => {
    render(<FontesChips fontes={mockFontes} />)
    expect(screen.getByRole('button', { name: 'Embrapa Milho' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guia MIP 2023' })).toBeInTheDocument()
  })

  it('expands chip on click showing trecho and pagina', async () => {
    const user = userEvent.setup()
    render(<FontesChips fontes={mockFontes} />)

    await user.click(screen.getByRole('button', { name: 'Embrapa Milho' }))

    expect(screen.getByText('Controle integrado de pragas...')).toBeInTheDocument()
    expect(screen.getByText('· p. 34')).toBeInTheDocument()
  })

  it('collapses chip on second click', async () => {
    const user = userEvent.setup()
    render(<FontesChips fontes={mockFontes} />)

    await user.click(screen.getByRole('button', { name: 'Embrapa Milho' }))
    await user.click(screen.getByRole('button', { name: /Embrapa Milho/i }))

    expect(screen.queryByText('Controle integrado de pragas...')).not.toBeInTheDocument()
  })

  it('switching chips closes previous and opens new', async () => {
    const user = userEvent.setup()
    render(<FontesChips fontes={mockFontes} />)

    await user.click(screen.getByRole('button', { name: 'Embrapa Milho' }))
    expect(screen.getByText('Controle integrado de pragas...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guia MIP 2023' }))
    expect(screen.queryByText('Controle integrado de pragas...')).not.toBeInTheDocument()
    expect(screen.getByText('Nível de controle recomendado...')).toBeInTheDocument()
  })
})
