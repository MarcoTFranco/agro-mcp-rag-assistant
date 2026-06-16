export default function WeatherCard({ resposta }) {
  if (!resposta.clima) {
    return null;
  }

  const c = resposta.clima;

  return (
    <div className="weather-card">
      <h3>Dados Climáticos — {c.cidade}</h3>
      <div className="weather-grid">
        <div className="weather-item">
          <span className="weather-label">Temperatura</span>
          <span className="weather-value">{c.temperatura_c}°C</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Sensação</span>
          <span className="weather-value">{c.sensacao_termica_c}°C</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Umidade</span>
          <span className="weather-value">{c.umidade_pct}%</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Vento</span>
          <span className="weather-value">{c.vento_kmh} km/h</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Condição</span>
          <span className="weather-value">{c.descricao}</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Nuvens</span>
          <span className="weather-value">{c.nuvens_pct}%</span>
        </div>
      </div>
      <div className="weather-badge">MCP: get_weather</div>
    </div>
  );
}
