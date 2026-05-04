import { supabase } from '@lib/supabase'
import type { Cliente } from '@oficina/types'

export async function listClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []) as Cliente[]
}

export async function getCliente(id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, veiculos(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCliente(data: {
  name: string
  phone?: string
  email?: string
  document?: string
  notes?: string
}) {
  const { data: result, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Cliente
}

export async function updateCliente(id: string, data: Partial<Cliente>) {
  const { data: result, error } = await supabase
    .from('clientes')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as Cliente
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

export async function getPortalData(token: string) {
  const { data, error } = await supabase.rpc('get_cliente_portal', { p_token: token })
  if (error) throw error
  return data as {
    cliente: Cliente
    oficina: { id: string; name: string; phone: string | null; address: string | null }
    veiculos: unknown[]
    ordens: unknown[]
  } | { error: string }
}
