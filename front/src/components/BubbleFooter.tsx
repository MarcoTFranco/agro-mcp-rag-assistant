import { useState } from 'react'
import { FontesChips } from './FontesChips'
import { WeatherCard } from './WeatherCard'
import type { FonteResponse, ClimaResponse } from '../types'
import './BubbleFooter.css'

interface BubbleFooterProps {
  fontes: FonteResponse[]
  mcpInvocados: string[]
  clima: ClimaResponse | null
}

export function BubbleFooter({ fontes, mcpInvocados, clima }: BubbleFooterProps) {
  const [open, setOpen] = useState(false)

  const temClima = mcpInvocados.includes('get_weather') && clima !== null
  const temFontes = fontes.length > 0

  if (!temFontes && !temClima) return null

  const fontesLabel = fontes.length === 1 ? '1 fonte' : `${fontes.length} fontes`

  return (
    <div className="bubble-footer">
      <button
        className="bubble-footer__toggle"
        onClick={() => setOpen(prev => !prev)}
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Ocultar detalhes' : 'Ver detalhes'}
      >
        <div className="bubble-footer__summary">
          {temFontes && <span>📚 {fontesLabel}</span>}
          {temFontes && temClima && (
            <span className="bubble-footer__sep" aria-hidden="true" />
          )}
          {temClima && <span>🌤 Clima consultado</span>}
        </div>
        <span className="bubble-footer__caret" aria-hidden="true">
          {open ? 'ocultar ▴' : 'ver ▾'}
        </span>
      </button>

      {open && (
        <div className="bubble-footer__content">
          {temFontes && <FontesChips fontes={fontes} />}
          {temClima && <WeatherCard visivel={true} clima={clima} />}
        </div>
      )}
    </div>
  )
}
