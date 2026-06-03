import './Header.css'

export function Header() {
  return (
    <header className="header">
      <svg className="header__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2C6.5 2 4 6 4 10c0 3.5 2 6.5 5 8v2h6v-2c3-1.5 5-4.5 5-8 0-4-2.5-8-8-8z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M12 10 Q10 8 8 10 Q10 12 12 10z M12 10 Q14 8 16 10 Q14 12 12 10z" fill="white" opacity="0.5" />
      </svg>
      <span className="header__title">AgroAssistente</span>
    </header>
  )
}
