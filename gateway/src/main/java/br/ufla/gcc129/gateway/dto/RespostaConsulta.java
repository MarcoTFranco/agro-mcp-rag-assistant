package br.ufla.gcc129.gateway.dto;

import java.util.List;

public record RespostaConsulta(
    String resposta,
    List<FonteRAG> fontes,
    List<String> mcpInvocados
) {}
