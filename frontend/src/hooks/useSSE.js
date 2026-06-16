import { useState, useCallback, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const GATEWAY_URL = "http://localhost:9090/consulta";

export function useSSE() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const abortRef = useRef(null);

  const consultar = useCallback(async (pergunta) => {
    // Cancela requisição anterior se existir
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setResultado(null);
    setErro(null);

    try {
      await fetchEventSource(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta }),
        signal: ctrl.signal,
        openWhenHidden: true,

        onmessage(event) {
          if (event.event === "resposta") {
            const data = JSON.parse(event.data);
            setResultado(data);
          }
        },

        onerror(err) {
          setErro("Erro de conexão com o servidor. Verifique se o Gateway está ativo.");
          throw err;
        },

        onclose() {
          setLoading(false);
        },
      });
    } catch (err) {
      if (err.name !== "AbortError" && !erro) {
        setErro("Não foi possível conectar ao servidor.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { consultar, loading, resultado, erro };
}
