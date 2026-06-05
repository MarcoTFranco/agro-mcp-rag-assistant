package br.ufla.gcc129.gateway.client;

import br.ufla.gcc129.gateway.dto.RespostaConsulta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
class OrquestradorClientTest {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private OrquestradorClient client;

    @Test
    void deveEnviarPerguntaERetornarResposta() {
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);

        server.expect(requestTo("http://localhost:8000/consulta"))
              .andExpect(method(HttpMethod.POST))
              .andExpect(jsonPath("$.pergunta").value("praga na soja"))
              .andRespond(withSuccess("""
                  {
                    "resposta": "Use produto X.",
                    "fontes": [{"titulo": "Embrapa", "trecho": "trecho", "pagina": 1}],
                    "mcp_invocados": ["get_weather"]
                  }
                  """, MediaType.APPLICATION_JSON));

        RespostaConsulta resposta = client.consultar("praga na soja");

        assertThat(resposta.resposta()).isEqualTo("Use produto X.");
        assertThat(resposta.fontes()).hasSize(1);
        assertThat(resposta.fontes().get(0).titulo()).isEqualTo("Embrapa");
        assertThat(resposta.mcpInvocados()).containsExactly("get_weather");

        server.verify();
    }
}
