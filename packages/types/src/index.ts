export type OsStatus = 'aberta' | 'em_andamento' | 'aguardando_peca' | 'pronta' | 'entregue' | 'cancelada'
export type OsItemTipo = 'servico' | 'peca'
export type AvariaMomento = 'entrada' | 'saida'
export type SenderType = 'staff' | 'cliente'
export type ProfileRole = 'admin' | 'mecanico'

export interface Oficina {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Profile {
  id: string
  oficina_id: string
  name: string
  email: string
  role: ProfileRole
  created_at: string
}

export interface Cliente {
  id: string
  oficina_id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
  cliente_token: string
  created_at: string
}

export interface Veiculo {
  id: string
  oficina_id: string
  cliente_id: string
  marca: string
  modelo: string
  ano: number | null
  placa: string | null
  cor: string | null
  km_entrada: number | null
  notes: string | null
  created_at: string
  cliente?: Pick<Cliente, 'id' | 'name'>
}

export interface Servico {
  id: string
  oficina_id: string
  nome: string
  descricao: string | null
  preco_padrao: number | null
  created_at: string
}

export interface OrdemServico {
  id: string
  oficina_id: string
  cliente_id: string | null
  veiculo_id: string | null
  numero: number
  titulo: string
  status: OsStatus
  km_entrada: number | null
  km_saida: number | null
  previsao_entrega: string | null
  valor_total: number
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
  cliente?: Pick<Cliente, 'id' | 'name' | 'phone'>
  veiculo?: Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'placa'>
}

export interface OsItem {
  id: string
  os_id: string
  oficina_id: string
  tipo: OsItemTipo
  descricao: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  created_at: string
}

export interface Avaria {
  id: string
  os_id: string
  oficina_id: string
  descricao: string
  foto_url: string | null
  momento: AvariaMomento
  created_at: string
}

export interface Conversa {
  id: string
  oficina_id: string
  cliente_id: string
  os_id: string | null
  created_at: string
  cliente?: Pick<Cliente, 'id' | 'name'>
  ultima_mensagem?: Pick<Mensagem, 'content' | 'created_at'>
}

export interface Mensagem {
  id: string
  conversa_id: string
  sender_id: string | null
  sender_type: SenderType
  content: string
  created_at: string
}
