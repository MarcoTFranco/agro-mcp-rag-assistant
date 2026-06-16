import './WeatherCard.css'

// TODO Fase 3: expandir props para receber dados climáticos estruturados do payload
interface WeatherCardProps {
  visivel: boolean
}

export function WeatherCard({ visivel }: WeatherCardProps) {
  if (!visivel) return null

  return (
    <div className="weather-card" role="note" aria-label="Dados climáticos consultados">
      <span className="weather-card__icon" aria-hidden="true">🌤️</span>
      <div className="weather-card__body">
        <span className="weather-card__label">Condições climáticas</span>
        <span className="weather-card__desc">
          Dados climáticos foram consultados para embasar esta resposta.
        </span>
      </div>
    </div>
  )
}
