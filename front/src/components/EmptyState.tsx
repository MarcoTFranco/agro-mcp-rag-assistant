import './EmptyState.css'

const SUGESTOES = [
  'Qual o manejo recomendado para lagarta-do-cartucho no milho?',
  'Posso aplicar fungicida com previsão de chuva nas próximas 4 horas?',
  'Quais inseticidas são indicados para controle de mosca-branca na soja?',
] as const

interface EmptyStateProps {
  onSugestao: (pergunta: string) => void
}

export function EmptyState({ onSugestao }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">🌱</div>
      <h2 className="empty-state__title">Como posso ajudar?</h2>
      <p className="empty-state__subtitle">
        Faça uma pergunta sobre manejo de pragas, doenças ou condições de aplicação.
      </p>
      <ul className="empty-state__sugestoes" role="list">
        {SUGESTOES.map(s => (
          <li key={s}>
            <button
              className="empty-state__sugestao"
              onClick={() => onSugestao(s)}
              type="button"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
