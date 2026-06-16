import "./App.css";
import ConsultaForm from "./components/ConsultaForm";
import RespostaPanel from "./components/RespostaPanel";
import WeatherCard from "./components/WeatherCard";
import { useSSE } from "./hooks/useSSE";

function App() {
  const { consultar, loading, resultado, erro } = useSSE();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Agro MCP RAG Assistant</h1>
        <p className="subtitle">
          Manejo inteligente de pragas com RAG + LLM + dados climáticos
        </p>
      </header>

      <main className="app-main">
        <ConsultaForm onSubmit={consultar} loading={loading} />

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Consultando base de conhecimento e gerando resposta...</p>
          </div>
        )}

        {erro && <div className="erro">{erro}</div>}

        {resultado && (
          <>
            <WeatherCard resposta={resultado} />
            <RespostaPanel resultado={resultado} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          GCC129 — Sistemas Distribuídos | UFLA 2026.1
        </p>
      </footer>
    </div>
  );
}

export default App;
