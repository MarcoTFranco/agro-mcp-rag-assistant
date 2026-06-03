export interface RespostaConsulta {
  resposta: string
  fontes: string[]
  mcp_invocados: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  fontes: string[]
  mcpInvocados: string[]
  erro: string | null
  loading: boolean
}
