import './RespostaDisplay.css'

interface RespostaDisplayProps {
  content: string
}

export function RespostaDisplay({ content }: RespostaDisplayProps) {
  return (
    <p className="resposta-display">
      {content}
    </p>
  )
}
