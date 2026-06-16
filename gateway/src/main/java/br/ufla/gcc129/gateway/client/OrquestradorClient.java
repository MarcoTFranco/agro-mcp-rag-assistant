package br.ufla.gcc129.gateway.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OrquestradorClient {

    private final RestClient restClient;

    public OrquestradorClient(@Value("${orchestrator.base-url}") String baseUrl) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(90_000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @SuppressWarnings("unchecked")
    @CircuitBreaker(name = "orchestrator", fallbackMethod = "fallback")
    public Map<String, Object> consultar(String pergunta) {
        log.info("Chamando Orquestrador: {}", pergunta.substring(0, Math.min(80, pergunta.length())));

        Map<String, Object> response = restClient.post()
                .uri("/consulta")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("pergunta", pergunta))
                .retrieve()
                .body(Map.class);

        log.info("Resposta recebida do Orquestrador");
        return response;
    }

    @SuppressWarnings("unused")
    private Map<String, Object> fallback(String pergunta, Throwable t) {
        log.warn("Circuit Breaker ativado | causa={}", t.getMessage());
        return Map.of(
                "resposta", "Serviço temporariamente indisponível. O sistema detectou falhas "
                        + "consecutivas e está aguardando recuperação. Tente novamente em instantes.",
                "fontes", List.of(),
                "mcp_invocados", List.of()
        );
    }
}
