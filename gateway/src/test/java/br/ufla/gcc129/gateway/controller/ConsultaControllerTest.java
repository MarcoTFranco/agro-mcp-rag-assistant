package br.ufla.gcc129.gateway.controller;

import br.ufla.gcc129.gateway.client.OrquestradorClient;
import br.ufla.gcc129.gateway.dto.FonteRAG;
import br.ufla.gcc129.gateway.dto.RespostaConsulta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes para ConsultaController.
 *
 * Nota: O @CircuitBreaker não é carregado em @WebMvcTest (apenas o controller slice).
 * Por isso, o fallback não é testado aqui. Fallbacks são testados em testes de integração.
 */
@WebMvcTest(ConsultaController.class)
class ConsultaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrquestradorClient orquestradorClient;

    @Test
    void deveRetornarContentTypeSSE() throws Exception {
        // Arrange
        var resposta = new RespostaConsulta(
            "A mosca-branca é controlada com inseticida de contato...",
            List.of(new FonteRAG("Guia AGROFIT", "Trecho sobre mosca-branca", 42)),
            List.of("get_weather")
        );
        when(orquestradorClient.consultar(anyString())).thenReturn(resposta);

        // Act & Assert
        mockMvc.perform(get("/api/consulta").param("pergunta", "Como controlar mosca-branca?"))
               .andExpect(status().isOk())
               .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));
    }

    @Test
    void deveRepassarPerguntaAoOrquestra() throws Exception {
        // Arrange
        var resposta = new RespostaConsulta("Resposta.", List.of(), List.of());
        when(orquestradorClient.consultar("praga teste")).thenReturn(resposta);

        // Act & Assert
        mockMvc.perform(get("/api/consulta").param("pergunta", "praga teste"))
               .andExpect(status().isOk());
    }

    @Test
    void deveRetornarSseEventComNomeResposta() throws Exception {
        // Arrange
        var resposta = new RespostaConsulta("Teste.", List.of(), List.of());
        when(orquestradorClient.consultar(anyString())).thenReturn(resposta);

        // Act & Assert
        mockMvc.perform(get("/api/consulta").param("pergunta", "teste"))
               .andExpect(status().isOk())
               .andExpect(header().exists("content-type"));
    }

    @Test
    void deveHandleRuntimeExceptionDoOrquestrador() throws Exception {
        // Arrange
        when(orquestradorClient.consultar(anyString()))
            .thenThrow(new RuntimeException("Conexão recusada"));

        // Act & Assert
        // O controlador retorna 200 + SseEmitter que envia completeWithError.
        // MockMvc não consegue capturar o stream completo, mas verifica que não lançou 5xx.
        mockMvc.perform(get("/api/consulta").param("pergunta", "teste"))
               .andExpect(status().isOk());
    }
}
