package com.agro.gateway.service;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class OrchestratorClient {

    private static final Logger log = LoggerFactory.getLogger(OrchestratorClient.class);

    private final RestClient restClient;
    private final CircuitBreaker circuitBreaker;

    public OrchestratorClient(
            @Value("${orchestrator.base-url}") String baseUrl,
            CircuitBreakerRegistry registry) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(90_000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.circuitBreaker = registry.circuitBreaker("orchestrator");
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> consultar(String pergunta) {
        try {
            return CircuitBreaker.decorateSupplier(circuitBreaker, () -> {
                log.info("Chamando Orquestrador: {}", pergunta.substring(0, Math.min(80, pergunta.length())));

                Map<String, Object> response = restClient.post()
                        .uri("/consulta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("pergunta", pergunta))
                        .retrieve()
                        .body(Map.class);

                log.info("Resposta recebida do Orquestrador");
                return response;
            }).get();

        } catch (Exception e) {
            log.error("Erro ao chamar Orquestrador: {}", e.getMessage());
            return fallback(pergunta, e);
        }
    }

    private Map<String, Object> fallback(String pergunta, Throwable t) {
        String mensagem;

        if (t instanceof RestClientException) {
            mensagem = "Orquestrador retornou erro. Tente novamente em instantes.";
        } else if (circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
            mensagem = "Serviço temporariamente indisponível (circuit breaker aberto). "
                    + "O sistema detectou falhas consecutivas e está aguardando recuperação.";
        } else {
            mensagem = "Não foi possível conectar ao Orquestrador. "
                    + "Verifique se os serviços estão ativos.";
        }

        return Map.of(
                "resposta", mensagem,
                "fontes", List.of(),
                "mcp_invocados", List.of()
        );
    }
}
