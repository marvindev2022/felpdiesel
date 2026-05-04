import { supabase } from '@lib/supabase'
import type { Avaria } from '@oficina/types'

export async function listAvarias(os_id: string) {
  const { data, error } = await supabase
    .from('avarias')
    .select('*')
    .eq('os_id', os_id)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Avaria[]
}

export async function createAvaria(data: {
  os_id: string
  descricao: string
  foto_url?: string
  momento: 'entrada' | 'saida'
}) {
  const { data: result, error } = await supabase
    .from('avarias')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Avaria
}

export async function deleteAvaria(id: string) {
  const { error } = await supabase.from('avarias').delete().eq('id', id)
  if (error) throw error
}

export async function uploadFoto(file: File, os_id: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${os_id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avarias')
    .upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

export function getFotoUrl(path: string): string {
  const { data } = supabase.storage.from('avarias').getPublicUrl(path)
  return data.publicUrl
}
