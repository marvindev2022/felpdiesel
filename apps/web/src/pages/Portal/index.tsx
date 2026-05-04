import { useEffect, useRef, useState } from 'react'
import { getPortalByCpfPlaca } from '@services/clientes'

import { getOrCreateConversaByToken, sendMessageAsCliente, subscribeToMessages } from '@services/chat'
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
  // Login form (CPF + placa)
  const [cpf, setCpf] = useState('')
  const [placa, setPlaca] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Portal data
  const [data, setData] = useState<PortalData | null>(null)
  const [clienteToken, setClienteToken] = useState<string | null>(null)

  // Chat
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversa) return
    const channel = subscribeToMessages(conversa.id, (msg) => {
      setMensagens((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg])
    })
    return () => { channel.unsubscribe() }
  }, [conversa?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function loadConversa(_clienteId: string, osId: string | undefined, tok: string) {
    try {
      const result = await getOrCreateConversaByToken(tok, osId)
      if ('error' in result) return
      setConversa(result.conversa)
      setMensagens(result.mensagens ?? [])
    } catch {
      // chat falha silenciosamente
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!cpf.trim() || !placa.trim()) return
    setLoginLoading(true)
    setLoginError(null)
    try {
      const result = await getPortalByCpfPlaca(cpf, placa)
      if ('error' in result) {
        setLoginError(result.error as string)
        return
      }
      const pd = result as PortalData
      setData(pd)
      setClienteToken(pd.cliente.cliente_token)
      await loadConversa(pd.cliente.id, pd.ordens?.[0]?.os?.id, pd.cliente.cliente_token)
    } catch {
      setLoginError('Erro ao buscar dados. Tente novamente.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    setData(null)
    setClienteToken(null)
    setConversa(null)
    setMensagens([])
    setCpf('')
    setPlaca('')
    setLoginError(null)
  }

  async function handleSendMsg(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteToken || !conversa || !newMsg.trim()) return
    setSending(true)
    try {
      const msg = await sendMessageAsCliente(clienteToken, conversa.id, newMsg.trim())
      setMensagens((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg])
      setNewMsg('')
    } catch {
      // silencioso
    } finally {
      setSending(false)
    }
  }

  // Tela de login (CPF + placa)
  if (!data) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / marca */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe sua ordem de serviço</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">CPF ou CNPJ</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Placa do veículo</label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC-1234 ou ABC1D23"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-mono uppercase focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              required
            />
          </div>

          {loginError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading || !cpf.trim() || !placa.trim()}
            className="h-11 rounded-lg bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loginLoading ? 'Buscando...' : 'Acessar meu portal'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Use o CPF/CNPJ cadastrado na oficina e a placa do seu veículo
        </p>
      </div>
    </div>
  )

  // Portal com dados
  const { cliente, oficina, ordens } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-amber-600 text-white">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/80 text-xs">{oficina.name}</p>
                <h1 className="text-lg font-bold leading-tight">Olá, {cliente.name.split(' ')[0]}!</h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              Sair
            </button>
          </div>
          <p className="mt-2 text-white/70 text-xs">Acompanhe seu veículo em tempo real</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">

        {/* Ordens de serviço */}
        {!ordens || ordens.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-sm">Nenhuma ordem de serviço ativa no momento.</p>
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
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      {os.data_entrada && <span>Entrada: {formatDate(os.data_entrada)}</span>}
                      {os.previsao_entrega && <span>Previsão: {formatDate(os.previsao_entrega)}</span>}
                      {os.data_saida_real && <span className="text-green-600 font-medium">Saída: {formatDate(os.data_saida_real)}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${osStatusColor(os.status)}`}>
                    {osStatusLabel(os.status)}
                  </span>
                </div>
                {(os.km_entrada != null || os.km_saida != null) && (
                  <div className="mt-2 flex gap-4 text-xs text-gray-400">
                    {os.km_entrada != null && <span>KM entrada: {os.km_entrada.toLocaleString('pt-BR')}</span>}
                    {os.km_saida != null && <span>KM saída: {os.km_saida.toLocaleString('pt-BR')}</span>}
                  </div>
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

          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto p-4">
            {mensagens.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Nenhuma mensagem ainda. Diga olá!</p>
            ) : (
              mensagens.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${msg.sender_type === 'cliente' ? 'rounded-br-sm bg-amber-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-900'}`}>
                    {msg.content}
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
              className="rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {oficina.name}{oficina.phone ? ` · ${oficina.phone}` : ''}{oficina.address ? ` · ${oficina.address}` : ''}
        </p>
      </div>
    </div>
  )
}
