export interface FonteResponse {
  titulo: string
  trecho: string
  pagina: number
}

export interface ClimaResponse {
  disponivel: boolean
  cidade: string
  temperatura_c: number
  sensacao_termica_c: number
  umidade_pct: number
  vento_kmh: number
  descricao: string
  nuvens_pct: number
}

export interface RespostaConsulta {
  resposta: string
  fontes: FonteResponse[]
  mcp_invocados: string[]
  clima?: ClimaResponse
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  fontes: FonteResponse[]
  mcpInvocados: string[]
  clima: ClimaResponse | null
  erro: string | null
  loading: boolean
}
