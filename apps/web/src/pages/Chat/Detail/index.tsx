import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import { useAuth } from '@contexts/auth'
import type { Conversa } from '@oficina/types'

type Mensagem = {
  id: string
  sender_id: string | null
  sender_type: 'staff' | 'cliente'
  content: string
  created_at: string
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function groupByDate(msgs: Mensagem[]) {
  const groups: { label: string; msgs: Mensagem[] }[] = []
  let cur = ''
  for (const m of msgs) {
    const label = formatDateLabel(m.created_at)
    if (label !== cur) { groups.push({ label, msgs: [m] }); cur = label }
    else groups[groups.length - 1].msgs.push(m)
  }
  return groups
}

function sameCluster(a: Mensagem, b: Mensagem) {
  if (a.sender_type !== b.sender_type) return false
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 2 * 60 * 1000
}

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (!id) return

    async function load() {
      const { data: conv, error: convErr } = await supabase
        .from('conversas')
        .select('*, cliente:clientes(id, name)')
        .eq('id', id)
        .single()

      if (convErr || !conv) { setError('Conversa não encontrada.'); setIsLoading(false); return }
      setConversa(conv as Conversa)

      const { data: msgs, error: msgsErr } = await supabase
        .from('mensagens')
        .select('id, sender_id, sender_type, content, created_at')
        .eq('conversa_id', id)
        .order('created_at', { ascending: true })

      if (msgsErr) { setError('Erro ao carregar mensagens.'); setIsLoading(false); return }
      setMensagens((msgs ?? []) as Mensagem[])
      setIsLoading(false)
      setTimeout(() => scrollToBottom(false), 50)
    }

    load()

    const channel = supabase.channel(`chat_${id}`)
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `conversa_id=eq.${id}`,
      }, (payload) => {
        const incoming = payload.new as Mensagem
        setMensagens((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.sender_type === 'staff') return
        setOtherTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2500)
      })
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const incoming = payload as Mensagem
        if (!incoming?.id) return
        setMensagens((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [id])

  useEffect(() => {
    if (!isLoading) scrollToBottom()
  }, [mensagens, otherTyping])

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_type: 'staff' },
    })
  }

  async function handleSend() {
    if (!text.trim() || !id || isSending) return
    const content = text.trim()
    setText('')
    setIsSending(true)

    const tempId = `temp-${Date.now()}`
    setMensagens((prev) => [...prev, {
      id: tempId,
      sender_id: user?.id ?? null,
      sender_type: 'staff',
      content,
      created_at: new Date().toISOString(),
    }])

    const { data: inserted, error } = await supabase
      .from('mensagens')
      .insert({ conversa_id: id, sender_id: user?.id ?? null, sender_type: 'staff', content })
      .select('id, sender_id, sender_type, content, created_at')
      .single()

    if (inserted) {
      setMensagens((prev) => prev.map((m) => m.id === tempId ? inserted : m))
      channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted })
    } else if (error) {
      setMensagens((prev) => prev.filter((m) => m.id !== tempId))
    }

    setIsSending(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  )

  if (error || !conversa) return (
    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error ?? 'Conversa não encontrada.'}</div>
  )

  const term = searchTerm.trim().toLowerCase()
  const filtered = term ? mensagens.filter((m) => m.content.toLowerCase().includes(term)) : mensagens
  const groups = groupByDate(filtered)

  function highlight(content: string) {
    if (!term) return <>{content}</>
    const parts = content.split(new RegExp(`(${term})`, 'gi'))
    return <>{parts.map((p, i) => p.toLowerCase() === term ? <mark key={i} className="rounded bg-amber-200 text-amber-900">{p}</mark> : p)}</>
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <Link to="/chat" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-bold text-gray-900">{conversa.cliente?.name ?? 'Chat'}</h1>
          <p className="h-4 text-xs text-amber-600 transition-all">
            {otherTyping ? 'digitando...' : ''}
            {conversa.os_id && !otherTyping && (
              <Link to={`/ordens/${conversa.os_id}`} className="hover:underline">
                Ver ordem de serviço
              </Link>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowSearch((v) => !v); setSearchTerm('') }}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${showSearch ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </button>
      </div>

      {showSearch && (
        <div className="mb-2">
          <input
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar mensagem..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          {term && (
            <p className="mt-1 text-xs text-gray-400 pl-1">
              {filtered.length === 0 ? 'Nenhum resultado' : `${filtered.length} mensagem${filtered.length > 1 ? 's' : ''} encontrada${filtered.length > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      {/* Mensagens */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {mensagens.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400">Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {/* Separador de data */}
              <div className="my-3 flex items-center justify-center">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-xs text-gray-400">
                  {group.label}
                </span>
              </div>

              {group.msgs.map((msg, idx) => {
                const isMe = msg.sender_type === 'staff'
                const prev = group.msgs[idx - 1]
                const next = group.msgs[idx + 1]
                const isFirst = !prev || !sameCluster(prev, msg)
                const isLast = !next || !sameCluster(msg, next)
                const isTemp = msg.id.startsWith('temp-')

                const radiusMe = ['rounded-2xl', !isFirst ? 'rounded-tr-md' : '', isLast ? 'rounded-br-sm' : 'rounded-br-md'].filter(Boolean).join(' ')
                const radiusOther = ['rounded-2xl', !isFirst ? 'rounded-tl-md' : '', isLast ? 'rounded-bl-sm' : 'rounded-bl-md'].filter(Boolean).join(' ')

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!isLast ? 'mb-0' : 'mb-1'}`}>
                    <div className={`max-w-[75%] px-3 py-2 ${isMe
                      ? `bg-amber-600 text-white ${radiusMe} ${isTemp ? 'opacity-60' : ''}`
                      : `border border-gray-200 bg-gray-100 text-gray-900 ${radiusOther}`
                    }`}>
                      <p className="whitespace-pre-wrap break-words text-sm leading-snug">{highlight(msg.content)}</p>
                      <p className={`mt-0.5 text-right text-[10px] leading-none ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}

        {otherTyping && (
          <div className="mb-1 flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-100 px-4 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          style={{ maxHeight: '8rem', overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white transition-opacity hover:bg-amber-700 disabled:opacity-40"
        >
          <svg className="h-4 w-4 -rotate-90 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
