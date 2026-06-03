import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { ChatInput } from './components/ChatInput'
import { useConsultaRAG } from './hooks/useConsultaRAG'
import './components/Header.css'
import './App.css'

export default function App() {
  const { messages, loading, enviar, reenviar } = useConsultaRAG()

  return (
    <>
      <Header />
      <ChatWindow messages={messages} onSugestao={enviar} onReenviar={reenviar} />
      <ChatInput onEnviar={enviar} disabled={loading} />
    </>
  )
}
