import Markdown from 'react-markdown'
import './RespostaDisplay.css'

interface RespostaDisplayProps {
  content: string
}

export function RespostaDisplay({ content }: RespostaDisplayProps) {
  return (
    <div className="resposta-display">
      <Markdown>{content}</Markdown>
    </div>
  )
}
