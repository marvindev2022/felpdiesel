import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getOrdem, updateStatus, addItem, removeItem } from '@services/ordens'
import { listAvarias, createAvaria, deleteAvaria, uploadFoto, getFotoUrl } from '@services/avarias'
import { getOrCreateConversa, listMensagens, sendMessage, subscribeToMessages } from '@services/chat'
import { formatCurrency, formatDate, osStatusLabel, osStatusColor } from '@lib/format'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Badge, Input } from '@oficina/ui'
import type { OrdemServico, OsItem, Avaria, Mensagem, Conversa, OsStatus } from '@oficina/types'

const OS_STATUSES: OsStatus[] = ['aberta', 'em_andamento', 'aguardando_peca', 'pronta', 'entregue', 'cancelada']

export function OrdemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [os, setOs] = useState<OrdemServico & { os_itens?: OsItem[] } | null>(null)
  const [avarias, setAvarias] = useState<Avaria[]>([])
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modais
  const [showItemModal, setShowItemModal] = useState(false)
  const [showAvariaModal, setShowAvariaModal] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  // Item form
  const [itemForm, setItemForm] = useState({ tipo: 'servico' as 'servico' | 'peca', descricao: '', quantidade: '1', preco: '' })
  const [savingItem, setSavingItem] = useState(false)

  // Avaria form
  const [avariaForm, setAvariaForm] = useState({ descricao: '', momento: 'entrada' as 'entrada' | 'saida', foto: null as File | null })
  const [savingAvaria, setSavingAvaria] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    Promise.all([
      getOrdem(id),
      listAvarias(id),
    ])
      .then(async ([osData, avariaData]) => {
        setOs(osData)
        setAvarias(avariaData)
        if (osData.cliente_id) {
          const conv = await getOrCreateConversa(osData.cliente_id, id)
          setConversa(conv)
          const msgs = await listMensagens(conv.id)
          setMensagens(msgs)
        }
      })
      .catch(() => setError('Erro ao carregar ordem de serviço.'))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    if (!conversa) return
    const channel = subscribeToMessages(conversa.id, (msg) => {
      setMensagens((prev) => [...prev, msg])
    })
    return () => { channel.unsubscribe() }
  }, [conversa?.id])

  async function handleStatusChange(status: OsStatus) {
    if (!id) return
    try {
      const updated = await updateStatus(id, status)
      setOs((prev) => prev ? { ...prev, status: updated.status } : prev)
      notifySuccess(`Status atualizado para ${osStatusLabel(status)}`)
    } catch {
      notifyError('Erro ao atualizar status.')
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !itemForm.descricao || !itemForm.preco) return
    setSavingItem(true)
    try {
      const item = await addItem({
        os_id: id,
        tipo: itemForm.tipo,
        descricao: itemForm.descricao,
        quantidade: Number(itemForm.quantidade),
        preco_unitario: Number(itemForm.preco),
      })
      setOs((prev) => prev ? {
        ...prev,
        os_itens: [...(prev.os_itens ?? []), item],
        valor_total: prev.valor_total + item.subtotal,
      } : prev)
      setItemForm({ tipo: 'servico', descricao: '', quantidade: '1', preco: '' })
      setShowItemModal(false)
      notifySuccess('Item adicionado!')
    } catch {
      notifyError('Erro ao adicionar item.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleRemoveItem(itemId: string, subtotal: number) {
    if (!id) return
    try {
      await removeItem(itemId, id)
      setOs((prev) => prev ? {
        ...prev,
        os_itens: (prev.os_itens ?? []).filter((i) => i.id !== itemId),
        valor_total: Math.max(0, prev.valor_total - subtotal),
      } : prev)
      notifySuccess('Item removido.')
    } catch {
      notifyError('Erro ao remover item.')
    }
  }

  async function handleAddAvaria(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !avariaForm.descricao) return
    setSavingAvaria(true)
    try {
      let foto_url: string | undefined
      if (avariaForm.foto) {
        const path = await uploadFoto(avariaForm.foto, id)
        foto_url = getFotoUrl(path)
      }
      const avaria = await createAvaria({
        os_id: id,
        descricao: avariaForm.descricao,
        momento: avariaForm.momento,
        foto_url,
      })
      setAvarias((prev) => [...prev, avaria])
      setAvariaForm({ descricao: '', momento: 'entrada', foto: null })
      setShowAvariaModal(false)
      notifySuccess('Avaria registrada!')
    } catch {
      notifyError('Erro ao registrar avaria.')
    } finally {
      setSavingAvaria(false)
    }
  }

  async function handleDeleteAvaria(avariaId: string) {
    try {
      await deleteAvaria(avariaId)
      setAvarias((prev) => prev.filter((a) => a.id !== avariaId))
      notifySuccess('Avaria removida.')
    } catch {
      notifyError('Erro ao remover avaria.')
    }
  }

  async function handleSendMsg(e: React.FormEvent) {
    e.preventDefault()
    if (!conversa || !newMsg.trim()) return
    setSendingMsg(true)
    try {
      const msg = await sendMessage(conversa.id, newMsg.trim(), 'staff')
      setMensagens((prev) => [...prev, msg])
      setNewMsg('')
    } catch {
      notifyError('Erro ao enviar mensagem.')
    } finally {
      setSendingMsg(false)
    }
  }

  const inputCls = 'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  )

  if (error || !os) return (
    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error ?? 'OS não encontrada.'}</div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-gray-400">#{os.numero}</span>
            <h1 className="text-2xl font-bold text-gray-900">{os.titulo}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {os.cliente && (
              <Link to={`/clientes`} className="hover:text-amber-600">{os.cliente.name}</Link>
            )}
            {os.veiculo && (
              <span>{os.veiculo.marca} {os.veiculo.modelo} {os.veiculo.placa ? `· ${os.veiculo.placa}` : ''}</span>
            )}
            {os.previsao_entrega && (
              <span>Previsão: {formatDate(os.previsao_entrega)}</span>
            )}
            {os.km_entrada && <span>KM entrada: {os.km_entrada.toLocaleString()}</span>}
          </div>
        </div>

        {/* Status dropdown */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${osStatusColor(os.status)}`}>
            {osStatusLabel(os.status)}
          </span>
          <select
            value={os.status}
            onChange={(e) => handleStatusChange(e.target.value as OsStatus)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none"
          >
            {OS_STATUSES.map((s) => (
              <option key={s} value={s}>{osStatusLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Observações */}
      {os.observacoes && (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <span className="font-medium">Observações: </span>{os.observacoes}
        </div>
      )}

      {/* Itens */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Itens e Serviços</h2>
          <Button size="sm" onClick={() => setShowItemModal(true)}>+ Adicionar</Button>
        </div>

        {(os.os_itens ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhum item adicionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-center">Qtd</th>
                  <th className="px-4 py-2 text-right">Preço Unit.</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(os.os_itens ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <Badge variant={item.tipo === 'servico' ? 'info' : 'warning'}>
                        {item.tipo === 'servico' ? 'Serviço' : 'Peça'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-900">{item.descricao}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{item.quantidade}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.preco_unitario)}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.subtotal)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleRemoveItem(item.id, item.subtotal)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <span className="text-lg font-bold text-gray-900">Total: {formatCurrency(os.valor_total)}</span>
        </div>
      </div>

      {/* Avarias */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Avarias</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAvariaModal(true)}>+ Registrar</Button>
        </div>

        {avarias.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhuma avaria registrada.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {avarias.map((avaria) => (
              <div key={avaria.id} className="relative rounded-lg border border-gray-200 overflow-hidden">
                {avaria.foto_url && (
                  <img src={avaria.foto_url} alt={avaria.descricao} className="h-36 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={avaria.momento === 'entrada' ? 'warning' : 'info'} className="shrink-0">
                      {avaria.momento === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                    <button
                      onClick={() => handleDeleteAvaria(avaria.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{avaria.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Chat com o Cliente</h2>
          {!os.cliente_id && (
            <p className="text-xs text-gray-400 mt-1">Associe um cliente para habilitar o chat.</p>
          )}
        </div>

        {os.cliente_id && (
          <>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto p-4">
              {mensagens.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Nenhuma mensagem ainda.</p>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                        msg.sender_type === 'staff'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendMsg} className="flex gap-2 border-t border-gray-100 p-4">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Mensagem para o cliente..."
                className={`${inputCls} flex-1`}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMsg(e) } }}
              />
              <Button type="submit" isLoading={sendingMsg} disabled={!newMsg.trim()} size="md">
                Enviar
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Modal: Adicionar Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Adicionar Item</h3>
            <form onSubmit={handleAddItem} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={itemForm.tipo}
                  onChange={(e) => setItemForm((p) => ({ ...p, tipo: e.target.value as 'servico' | 'peca' }))}
                  className={inputCls}
                >
                  <option value="servico">Serviço</option>
                  <option value="peca">Peça</option>
                </select>
              </div>
              <Input
                label="Descrição *"
                value={itemForm.descricao}
                onChange={(e) => setItemForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Ex: Troca de óleo, Pastilha de freio..."
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  value={itemForm.quantidade}
                  onChange={(e) => setItemForm((p) => ({ ...p, quantidade: e.target.value }))}
                />
                <Input
                  label="Preço Unitário (R$) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.preco}
                  onChange={(e) => setItemForm((p) => ({ ...p, preco: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              {itemForm.preco && itemForm.quantidade && (
                <p className="text-sm text-gray-500">
                  Subtotal: <strong>{formatCurrency(Number(itemForm.preco) * Number(itemForm.quantidade))}</strong>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowItemModal(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" isLoading={savingItem} className="flex-1">Adicionar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Avaria */}
      {showAvariaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Registrar Avaria</h3>
            <form onSubmit={handleAddAvaria} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Momento</label>
                <select
                  value={avariaForm.momento}
                  onChange={(e) => setAvariaForm((p) => ({ ...p, momento: e.target.value as 'entrada' | 'saida' }))}
                  className={inputCls}
                >
                  <option value="entrada">Entrada do veículo</option>
                  <option value="saida">Saída do veículo</option>
                </select>
              </div>
              <Input
                label="Descrição *"
                value={avariaForm.descricao}
                onChange={(e) => setAvariaForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descreva a avaria..."
                required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Foto (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvariaForm((p) => ({ ...p, foto: e.target.files?.[0] ?? null }))}
                  className="text-sm text-gray-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAvariaModal(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" isLoading={savingAvaria} className="flex-1">Registrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
