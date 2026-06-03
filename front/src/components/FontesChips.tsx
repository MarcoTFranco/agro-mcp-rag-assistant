import './FontesChips.css'

interface FontesChipsProps {
  fontes: string[]
}

export function FontesChips({ fontes }: FontesChipsProps) {
  if (fontes.length === 0) return null

  return (
    <div className="fontes-chips" aria-label="Fontes consultadas">
      <span className="fontes-chips__label">Fontes:</span>
      <ul className="fontes-chips__list" role="list">
        {fontes.map((fonte, i) => (
          <li key={`${i}-${fonte}`} className="fontes-chips__chip">
            {fonte}
          </li>
        ))}
      </ul>
    </div>
  )
}
