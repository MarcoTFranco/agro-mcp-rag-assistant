import { useState } from "react";

export default function ConsultaForm({ onSubmit, loading }) {
  const [pergunta, setPergunta] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pergunta.trim() && !loading) {
      onSubmit(pergunta.trim());
    }
  };

  return (
    <form className="consulta-form" onSubmit={handleSubmit}>
      <textarea
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        placeholder="Descreva sua dúvida sobre manejo de pragas... Ex: Como tratar ferrugem asiática da soja com previsão de chuva amanhã em Lavras?"
        rows={3}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !pergunta.trim()}>
        {loading ? "Consultando..." : "Consultar"}
      </button>
    </form>
  );
}
