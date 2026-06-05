package br.ufla.gcc129.gateway.client;

import br.ufla.gcc129.gateway.dto.ConsultaRequest;
import br.ufla.gcc129.gateway.dto.RespostaConsulta;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrquestradorClient {

    private final RestTemplate restTemplate;

    @Value("${orquestrador.url}")
    private String orquestradorUrl;

    public RespostaConsulta consultar(String pergunta) {
        String url = orquestradorUrl + "/consulta";
        log.info("Chamando orquestrador: {} | pergunta: {}", url, pergunta);
        return restTemplate.postForObject(url, new ConsultaRequest(pergunta), RespostaConsulta.class);
    }
}
