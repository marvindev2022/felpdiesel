import { supabase } from '@lib/supabase'
import type { Servico } from '@oficina/types'

export async function listServicos(busca?: string) {
  let query = supabase
    .from('servicos')
    .select('*')
    .order('nome')

  if (busca?.trim()) {
    query = query.ilike('nome', `%${busca.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Servico[]
}

export async function createServico(data: {
  nome: string
  descricao?: string
  preco_padrao?: number
}) {
  const { data: result, error } = await supabase
    .from('servicos')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Servico
}

export async function updateServico(id: string, data: {
  nome?: string
  descricao?: string | null
  preco_padrao?: number | null
}) {
  const { data: result, error } = await supabase
    .from('servicos')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as Servico
}

export async function deleteServico(id: string) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}
