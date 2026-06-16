export default function RespostaPanel({ resultado }) {
  if (!resultado) return null;

  return (
    <div className="resposta-panel">
      <div className="resposta-texto">
        <h2>Resposta</h2>
        <p>{resultado.resposta}</p>
      </div>

      {resultado.fontes && resultado.fontes.length > 0 && (
        <div className="fontes-section">
          <h3>Fontes Consultadas</h3>
          {resultado.fontes.map((fonte, i) => (
            <details key={i} className="fonte-card">
              <summary>{fonte.titulo}</summary>
              <p className="fonte-trecho">{fonte.trecho}</p>
              <span className="fonte-pagina">Trecho #{fonte.pagina}</span>
            </details>
          ))}
        </div>
      )}

      {resultado.mcp_invocados && resultado.mcp_invocados.length > 0 && (
        <div className="mcp-section">
          <h3>Serviços MCP Invocados</h3>
          <div className="mcp-badges">
            {resultado.mcp_invocados.map((mcp, i) => (
              <span key={i} className="mcp-badge">{mcp}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
