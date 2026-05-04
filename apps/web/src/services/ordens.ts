import { supabase } from '@lib/supabase'
import type { OrdemServico, OsItem, OsStatus } from '@oficina/types'

export async function listOrdens(filters?: { status?: OsStatus; cliente_id?: string }) {
  let query = supabase
    .from('ordens_servico')
    .select(`
      *,
      cliente:clientes(id, name, phone),
      veiculo:veiculos(id, marca, modelo, placa)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.cliente_id) query = query.eq('cliente_id', filters.cliente_id)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as OrdemServico[]
}

export async function getOrdem(id: string) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select(`
      *,
      cliente:clientes(id, name, phone),
      veiculo:veiculos(id, marca, modelo, placa),
      os_itens(*),
      avarias(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as OrdemServico & { os_itens: OsItem[] }
}

export async function deleteOrdem(id: string) {
  const { error } = await supabase.from('ordens_servico').delete().eq('id', id)
  if (error) throw error
}

export async function createOrdem(data: {
  cliente_id?: string
  veiculo_id?: string
  titulo: string
  km_entrada?: number
  data_entrada?: string
  previsao_entrega?: string
  observacoes?: string
}) {
  const { data: result, error } = await supabase
    .from('ordens_servico')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as OrdemServico
}

export async function updateOrdem(id: string, data: Partial<OrdemServico>) {
  const { data: result, error } = await supabase
    .from('ordens_servico')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as OrdemServico
}

export async function updateStatus(id: string, status: OsStatus) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as OrdemServico
}

export async function addItem(item: {
  os_id: string
  tipo: 'servico' | 'peca'
  descricao: string
  quantidade: number
  preco_unitario: number
}) {
  const subtotal = item.quantidade * item.preco_unitario
  const { data, error } = await supabase
    .from('os_itens')
    .insert({ ...item, subtotal })
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('recalcular_total_os', { p_os_id: item.os_id })

  return data as OsItem
}

export async function removeItem(id: string, os_id: string) {
  const { error } = await supabase.from('os_itens').delete().eq('id', id)
  if (error) throw error
  await supabase.rpc('recalcular_total_os', { p_os_id: os_id })
}

export async function getStats() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('ordens_servico')
    .select('status, valor_total, created_at')
  if (error) throw error

  const rows = data ?? []
  const counts: Record<OsStatus, number> = {
    aberta: 0, em_andamento: 0, aguardando_peca: 0,
    pronta: 0, entregue: 0, cancelada: 0,
  }
  let entreguesHoje = 0
  let totalDia = 0

  for (const row of rows) {
    counts[row.status as OsStatus] = (counts[row.status as OsStatus] ?? 0) + 1
    if (row.status === 'entregue' && row.created_at?.startsWith(today)) {
      entreguesHoje++
      totalDia += row.valor_total ?? 0
    }
  }

  return { counts, entreguesHoje, totalDia }
}
