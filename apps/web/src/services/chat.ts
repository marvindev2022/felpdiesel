import { supabase } from '@lib/supabase'
import type { Conversa, Mensagem, SenderType } from '@oficina/types'

export async function listConversas() {
  const { data, error } = await supabase
    .from('conversas')
    .select(`
      *,
      cliente:clientes(id, name),
      ultima_mensagem:mensagens(content, created_at)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Conversa[]
}

export async function getConversa(id: string) {
  const { data, error } = await supabase
    .from('conversas')
    .select('*, cliente:clientes(id, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Conversa
}

export async function getOrCreateConversa(cliente_id: string, os_id?: string) {
  // Busca qualquer conversa do cliente (não filtra por os_id)
  const { data: existing } = await supabase
    .from('conversas')
    .select('*')
    .eq('cliente_id', cliente_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing) return existing as Conversa

  // Criar nova
  const { data, error } = await supabase
    .from('conversas')
    .insert({ cliente_id, os_id: os_id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Conversa
}

export async function listMensagens(conversa_id: string) {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('conversa_id', conversa_id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Mensagem[]
}

export async function sendMessage(conversa_id: string, content: string, sender_type: SenderType) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('mensagens')
    .insert({
      conversa_id,
      content,
      sender_type,
      sender_id: user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Mensagem
}

export async function getOrCreateConversaByToken(token: string, _osId?: string) {
  // Sempre passa osId=null para reutilizar a conversa existente do cliente
  // independente de qual OS foi aberta na staff side
  const { data, error } = await supabase.rpc('get_or_create_conversa_by_token', {
    p_token: token,
    p_os_id: null,
  })
  if (error) throw error
  return data as { conversa: Conversa; mensagens: Mensagem[] } | { error: string }
}

export async function sendMessageAsCliente(token: string, conversa_id: string, content: string) {
  const { data, error } = await supabase.rpc('send_message_cliente', {
    p_token: token,
    p_conversa_id: conversa_id,
    p_content: content,
  })
  if (error) throw error
  return data as Mensagem
}

export function subscribeToMessages(conversa_id: string, callback: (msg: Mensagem) => void) {
  return supabase
    .channel(`mensagens:${conversa_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `conversa_id=eq.${conversa_id}`,
      },
      (payload) => callback(payload.new as Mensagem)
    )
    .subscribe()
}
