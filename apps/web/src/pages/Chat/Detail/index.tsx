import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getConversa, listMensagens, sendMessage, subscribeToMessages } from '@services/chat'
import { formatDateTime } from '@lib/format'
import { notifyError } from '@components/Toast'
import { Button } from '@oficina/ui'
import type { Conversa, Mensagem } from '@oficina/types'

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    Promise.all([getConversa(id), listMensagens(id)])
      .then(([conv, msgs]) => { setConversa(conv); setMensagens(msgs) })
      .catch(() => setError('Erro ao carregar conversa.'))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    const channel = subscribeToMessages(id, (msg) => {
      setMensagens((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return () => { channel.unsubscribe() }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newMsg.trim()) return
    setSending(true)
    try {
      const msg = await sendMessage(id, newMsg.trim(), 'staff')
      setMensagens((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setNewMsg('')
    } catch {
      notifyError('Erro ao enviar mensagem.')
    } finally {
      setSending(false)
    }
  }

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  )

  if (error || !conversa) return (
    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error ?? 'Conversa não encontrada.'}</div>
  )

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link to="/chat" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{conversa.cliente?.name ?? 'Chat'}</h1>
          {conversa.os_id && (
            <Link to={`/ordens/${conversa.os_id}`} className="text-xs text-amber-600 hover:underline">
              Ver ordem de serviço
            </Link>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {mensagens.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400">Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-xs flex-col gap-0.5 ${msg.sender_type === 'staff' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    msg.sender_type === 'staff'
                      ? 'rounded-br-sm bg-amber-600 text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400">{formatDateTime(msg.created_at)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="h-11 flex-1 rounded-xl border border-gray-300 px-4 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <Button type="submit" isLoading={sending} disabled={!newMsg.trim()} size="lg">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </form>
    </div>
  )
}
