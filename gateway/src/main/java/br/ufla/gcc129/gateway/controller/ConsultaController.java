package br.ufla.gcc129.gateway.controller;

import br.ufla.gcc129.gateway.client.OrquestradorClient;
import br.ufla.gcc129.gateway.dto.RespostaConsulta;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ConsultaController {

    private final OrquestradorClient orquestradorClient;

    @Value("${gateway.sse.timeout:30000}")
    private long sseTimeout;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    /**
     * Endpoint SSE para consulta ao orquestrador.
     * Protegido por Circuit Breaker que detecta falhas do orquestrador.
     *
     * @param pergunta texto da pergunta do usuário
     * @return SseEmitter que transmite a resposta em stream
     */
    @CircuitBreaker(name = "orquestrador", fallbackMethod = "fallbackConsulta")
    @GetMapping(value = "/consulta", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter consultar(@RequestParam String pergunta) {
        SseEmitter emitter = new SseEmitter(sseTimeout);

        executor.submit(() -> {
            try {
                log.info("Consultando orquestrador | perguntaLen={}", pergunta.length());
                RespostaConsulta resposta = orquestradorClient.consultar(pergunta);
                emitter.send(SseEmitter.event().name("resposta").data(resposta));
                log.info("Resposta enviada ao cliente | fontesCount={} | mcpCount={}",
                    resposta.fontes().size(), resposta.mcpInvocados().size());
                emitter.complete();
            } catch (Exception e) {
                log.error("Erro ao processar consulta: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event()
                        .name("erro")
                        .data("{\"erro\": \"Serviço temporariamente indisponível. Tente novamente em instantes.\"}"));
                    emitter.complete();
                } catch (IOException ioe) {
                    emitter.completeWithError(ioe);
                }
            }
        });

        return emitter;
    }

    /**
     * Fallback acionado quando o Circuit Breaker detecta falha do orquestrador.
     *
     * @param pergunta texto original da pergunta
     * @param t exceção que causou a abertura do circuit breaker
     * @return SseEmitter com mensagem de erro
     */
    public SseEmitter fallbackConsulta(String pergunta, Throwable t) {
        log.warn("Circuit Breaker ativado para orquestrador | perguntaLen={} | causa={}",
            pergunta.length(), t.getMessage());
        SseEmitter emitter = new SseEmitter();
        try {
            emitter.send(SseEmitter.event()
                .name("erro")
                .data("{\"erro\": \"Serviço temporariamente indisponível. Tente novamente em instantes.\"}"));
            emitter.complete();
        } catch (IOException e) {
            log.error("Erro ao enviar fallback SSE: {}", e.getMessage());
            emitter.completeWithError(e);
        }
        return emitter;
    }
}
