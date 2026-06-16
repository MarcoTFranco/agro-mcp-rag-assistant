package com.agro.gateway.controller;

import com.agro.gateway.service.OrchestratorClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/consulta")
public class ConsultaController {

    private static final Logger log = LoggerFactory.getLogger(ConsultaController.class);

    private final OrchestratorClient orchestratorClient;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public ConsultaController(OrchestratorClient orchestratorClient, ObjectMapper objectMapper) {
        this.orchestratorClient = orchestratorClient;
        this.objectMapper = objectMapper;
    }

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> consultar(@RequestBody Map<String, String> body) {
        String pergunta = body.getOrDefault("pergunta", "").trim();

        if (pergunta.isEmpty()) {
            log.warn("Consulta recebida com pergunta vazia");
            return ResponseEntity.badRequest().build();
        }

        log.info("Nova consulta SSE: {}", pergunta.substring(0, Math.min(80, pergunta.length())));

        SseEmitter emitter = new SseEmitter(90_000L);

        executor.execute(() -> {
            try {
                Map<String, Object> resultado = orchestratorClient.consultar(pergunta);

                String json = objectMapper.writeValueAsString(resultado);
                emitter.send(SseEmitter.event()
                        .name("resposta")
                        .data(json, MediaType.APPLICATION_JSON));

                emitter.complete();
                log.info("SSE completo para consulta");

            } catch (Exception e) {
                log.error("Erro no SSE: {}", e.getMessage());
                emitter.completeWithError(e);
            }
        });

        emitter.onTimeout(() -> {
            log.warn("SSE timeout para consulta");
            emitter.complete();
        });

        return ResponseEntity.ok(emitter);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Encerrando thread pool do ConsultaController...");
        executor.shutdown();
        try {
            if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
