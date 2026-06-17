import type { ClimaResponse } from '../types'
import './WeatherCard.css'

interface WeatherCardProps {
  visivel: boolean
  clima: ClimaResponse | null
}

export function WeatherCard({ visivel, clima }: WeatherCardProps) {
  if (!visivel || !clima) return null

  return (
    <div className="weather-card" role="note" aria-label="Dados climáticos consultados">
      <div className="weather-card__header">
        <div className="weather-card__city-row">
          <span className="weather-card__icon" aria-hidden="true">🌤️</span>
          <span className="weather-card__city">{clima.cidade}</span>
          <span className="weather-card__desc">{clima.descricao}</span>
        </div>
        <span className="weather-card__temp">{clima.temperatura_c}°C</span>
      </div>
      <div className="weather-card__metrics">
        <div className="weather-card__metric">
          <span className="weather-card__metric-label">Sensação térmica</span>
          <span className="weather-card__metric-value">{clima.sensacao_termica_c}°C</span>
        </div>
        <div className="weather-card__metric">
          <span className="weather-card__metric-label">Umidade</span>
          <span className="weather-card__metric-value">{clima.umidade_pct}%</span>
        </div>
        <div className="weather-card__metric">
          <span className="weather-card__metric-label">Vento</span>
          <span className="weather-card__metric-value">{clima.vento_kmh} km/h</span>
        </div>
        <div className="weather-card__metric">
          <span className="weather-card__metric-label">Nuvens</span>
          <span className="weather-card__metric-value">{clima.nuvens_pct}%</span>
        </div>
      </div>
    </div>
  )
}
