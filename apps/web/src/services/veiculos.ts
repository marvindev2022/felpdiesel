import { supabase } from '@lib/supabase'
import type { Veiculo } from '@oficina/types'

export async function listVeiculos(cliente_id?: string) {
  let query = supabase
    .from('veiculos')
    .select('*, cliente:clientes(id, name)')
    .order('created_at', { ascending: false })

  if (cliente_id) query = query.eq('cliente_id', cliente_id)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Veiculo[]
}

export async function createVeiculo(data: {
  cliente_id: string
  marca: string
  modelo: string
  ano?: number
  placa?: string
  cor?: string
  km_entrada?: number
  notes?: string
}) {
  const { data: result, error } = await supabase
    .from('veiculos')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Veiculo
}

export async function updateVeiculo(id: string, data: Partial<Veiculo>) {
  const { data: result, error } = await supabase
    .from('veiculos')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as Veiculo
}

export async function deleteVeiculo(id: string) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw error
}
