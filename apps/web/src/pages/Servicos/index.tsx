import { useEffect, useState } from 'react'
import { listServicos, createServico, updateServico, deleteServico } from '@services/servicos'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Input } from '@oficina/ui'
import { formatCurrency } from '@lib/format'
import type { Servico } from '@oficina/types'

type Form = { nome: string; descricao: string; preco_padrao: string }
const emptyForm: Form = { nome: '', descricao: '', preco_padrao: '' }

export function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [filtrados, setFiltrados] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    listServicos()
      .then((data) => { setServicos(data); setFiltrados(data) })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const q = busca.toLowerCase()
    setFiltrados(
      servicos.filter((s) =>
        s.nome.toLowerCase().includes(q) ||
        (s.descricao ?? '').toLowerCase().includes(q)
      )
    )
  }, [busca, servicos])

  function openCriar() {
    setEditando(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEditar(s: Servico) {
    setEditando(s)
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? '',
      preco_padrao: s.preco_padrao?.toString() ?? '',
    })
    setShowModal(true)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        preco_padrao: form.preco_padrao ? Number(form.preco_padrao) : undefined,
      }
      if (editando) {
        const updated = await updateServico(editando.id, payload)
        setServicos((prev) => prev.map((s) => s.id === updated.id ? updated : s))
        notifySuccess('Serviço atualizado!')
      } else {
        const novo = await createServico(payload)
        setServicos((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
        notifySuccess('Serviço cadastrado!')
      }
      setShowModal(false)
    } catch {
      notifyError('Erro ao salvar serviço.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletar(id: string) {
    setDeletandoId(id)
    try {
      await deleteServico(id)
      setServicos((prev) => prev.filter((s) => s.id !== id))
      notifySuccess('Serviço removido.')
    } catch {
      notifyError('Erro ao remover serviço.')
    } finally {
      setDeletandoId(null)
    }
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtrados.length} {filtrados.length === 1 ? 'serviço' : 'serviços'} cadastrados
          </p>
        </div>
        <Button onClick={openCriar}>+ Novo Serviço</Button>
      </div>

      {/* Busca */}
      <input
        type="search"
        placeholder="Buscar por nome ou descrição..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-sm text-gray-500">
            {busca ? 'Nenhum serviço encontrado para essa busca.' : 'Nenhum serviço cadastrado ainda.'}
          </p>
          {!busca && (
            <button onClick={openCriar} className="mt-3 text-sm text-amber-600 hover:underline">
              Cadastrar primeiro serviço
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Descrição</th>
                <th className="px-4 py-3 text-right">Preço Padrão</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nome}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                    {s.descricao ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {s.preco_padrao != null ? formatCurrency(s.preco_padrao) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditar(s)}
                        className="text-gray-400 hover:text-amber-600 transition-colors"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletar(s.id)}
                        disabled={deletandoId === s.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Excluir"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {editando ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSalvar} className="flex flex-col gap-4">
              <Input
                label="Nome *"
                value={form.nome}
                onChange={set('nome')}
                placeholder="Ex: Troca de óleo, Alinhamento..."
                autoFocus
                required
              />
              <Input
                label="Preço Padrão (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_padrao}
                onChange={set('preco_padrao')}
                placeholder="0,00"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={set('descricao')}
                  rows={2}
                  placeholder="Detalhes do serviço (opcional)..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" isLoading={saving} className="flex-1">
                  {editando ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
