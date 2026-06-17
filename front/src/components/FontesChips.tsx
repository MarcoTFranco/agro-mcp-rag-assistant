import { useState } from 'react'
import type { FonteResponse } from '../types'
import './FontesChips.css'

interface FontesChipsProps {
  fontes: FonteResponse[]
}

export function FontesChips({ fontes }: FontesChipsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (fontes.length === 0) return null

  function handleChipClick(index: number) {
    setSelectedIndex(prev => prev === index ? null : index)
  }

  return (
    <div className="fontes-chips" aria-label="Fontes consultadas">
      <span className="fontes-chips__label">Fontes consultadas</span>
      <ul className="fontes-chips__list" role="list">
        {fontes.map((fonte, i) => (
          <li key={`${i}-${fonte.titulo}`}>
            {selectedIndex === i ? (
              <div className="fontes-chips__chip fontes-chips__chip--expanded">
                <button
                  className="fontes-chips__chip-header"
                  onClick={() => handleChipClick(i)}
                  type="button"
                >
                  <span className="fontes-chips__chip-titulo">{fonte.titulo}</span>
                  <span className="fontes-chips__chip-pagina">· p. {fonte.pagina}</span>
                </button>
                <p className="fontes-chips__chip-trecho">{fonte.trecho}</p>
              </div>
            ) : (
              <button
                className="fontes-chips__chip"
                onClick={() => handleChipClick(i)}
                type="button"
              >
                {fonte.titulo}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
