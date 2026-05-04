import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPortalData } from '@services/clientes'
import { getOrCreateConversa, listMensagens, sendMessageAsCliente, subscribeToMessages } from '@services/chat'
import { formatCurrency, formatDate, osStatusLabel, osStatusColor } from '@lib/format'
import type { Cliente, OrdemServico, OsItem, Avaria, Mensagem, Conversa, Veiculo } from '@oficina/types'

interface PortalOsEntry {
  os: OrdemServico
  itens: OsItem[] | null
  avarias: Avaria[] | null
}

interface PortalData {
  cliente: Cliente
  oficina: { id: string; name: string; phone: string | null; address: string | null }
  veiculos: Veiculo[] | null
  ordens: PortalOsEntry[] | null
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) { setError('Token inválido.'); setIsLoading(false); return }
    getPortalData(token)
      .then(async (result) => {
        if ('error' in result) { setError(result.error as string); return }
        const portalData = result as PortalData
        setData(portalData)
        // Buscar/criar conversa do cliente
        try {
          // Usar a OS mais recente como contexto da conversa, se existir
          const osId = portalData.ordens?.[0]?.os?.id
          const conv = await getOrCreateConversa(portalData.cliente.id, osId)
          setConversa(conv)
          const msgs = await listMensagens(conv.id)
          setMensagens(msgs)
        } catch {
          // Conversa falhou silenciosamente — não bloqueia o portal
        }
      })
      .catch(() => setError('Erro ao carregar dados. Verifique o link.'))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    if (!conversa) return
    const channel = subscribeToMessages(conversa.id, (msg) => {
      setMensagens((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return () => { channel.unsubscribe() }
  }, [conversa?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleSendMsg(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !conversa || !newMsg.trim()) return
    setSending(true)
    try {
      const msg = await sendMessageAsCliente(token, conversa.id, newMsg.trim())
      setMensagens((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setNewMsg('')
    } catch {
      // silencioso no portal
    } finally {
      setSending(false)
    }
  }

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  )

  if (error || !data) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <svg className="mx-auto mb-3 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">Link inválido</h2>
        <p className="mt-2 text-sm text-gray-500">{error ?? 'Este link não é válido ou expirou.'}</p>
      </div>
    </div>
  )

  const { cliente, oficina, ordens } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-amber-600 text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white/80 text-sm">{oficina.name}</p>
              <h1 className="text-xl font-bold">Olá, {cliente.name.split(' ')[0]}!</h1>
            </div>
          </div>
          <p className="mt-2 text-white/70 text-sm">Acompanhe seu veículo em tempo real</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">

        {/* Ordens de serviço */}
        {!ordens || ordens.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">Nenhuma ordem de serviço ativa no momento.</p>
          </div>
        ) : (
          ordens.map(({ os, itens, avarias: avariaList }) => (
            <div key={os.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* OS Header */}
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-400">#{os.numero}</span>
                      <h2 className="font-semibold text-gray-900">{os.titulo}</h2>
                    </div>
                    {os.previsao_entrega && (
                      <p className="mt-0.5 text-xs text-gray-500">Previsão: {formatDate(os.previsao_entrega)}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${osStatusColor(os.status)}`}>
                    {osStatusLabel(os.status)}
                  </span>
                </div>
                {os.km_entrada != null && (
                  <p className="mt-1 text-xs text-gray-400">KM entrada: {os.km_entrada.toLocaleString()}</p>
                )}
              </div>

              {/* Itens */}
              {itens && itens.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Serviços e Peças</h3>
                  <div className="flex flex-col gap-2">
                    {itens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${item.tipo === 'servico' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.tipo === 'servico' ? 'Serviço' : 'Peça'}
                          </span>
                          <span className="truncate text-gray-700">{item.descricao}</span>
                          {item.quantidade > 1 && <span className="shrink-0 text-xs text-gray-400">x{item.quantidade}</span>}
                        </div>
                        <span className="shrink-0 font-medium text-gray-900 ml-3">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                    <span className="font-bold text-gray-900">Total: {formatCurrency(os.valor_total)}</span>
                  </div>
                </div>
              )}

              {/* Avarias */}
              {avariaList && avariaList.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Avarias Registradas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {avariaList.map((avaria) => (
                      <div key={avaria.id} className="rounded-lg border border-gray-200 overflow-hidden">
                        {avaria.foto_url && (
                          <img src={avaria.foto_url} alt={avaria.descricao} className="h-28 w-full object-cover" />
                        )}
                        <div className="p-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${avaria.momento === 'entrada' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                            {avaria.momento === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                          <p className="mt-1 text-xs text-gray-600">{avaria.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Chat com a oficina */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Chat com a Oficina</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tire dúvidas diretamente com a equipe</p>
          </div>

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto p-4">
            {mensagens.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Nenhuma mensagem ainda. Diga olá!</p>
            ) : (
              mensagens.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-xs flex-col gap-0.5 ${msg.sender_type === 'cliente' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-2 text-sm ${msg.sender_type === 'cliente' ? 'rounded-br-sm bg-amber-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-900'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSendMsg} className="flex gap-2 border-t border-gray-100 p-4">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Mensagem para a oficina..."
              className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMsg(e) } }}
            />
            <button
              type="submit"
              disabled={sending || !newMsg.trim()}
              className="rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {oficina.name} {oficina.phone ? `· ${oficina.phone}` : ''} {oficina.address ? `· ${oficina.address}` : ''}
        </p>
      </div>
    </div>
  )
}
