import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listVeiculos, createVeiculo, updateVeiculo, deleteVeiculo } from '@services/veiculos'
import { listClientes } from '@services/clientes'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Input } from '@oficina/ui'
import type { Veiculo, Cliente } from '@oficina/types'

type Form = {
  cliente_id: string
  marca: string
  modelo: string
  ano: string
  placa: string
  cor: string
  km_entrada: string
}

function emptyForm(clienteIdParam: string): Form {
  return { cliente_id: clienteIdParam, marca: '', modelo: '', ano: '', placa: '', cor: '', km_entrada: '' }
}

export function VeiculosPage() {
  const [searchParams] = useSearchParams()
  const clienteIdParam = searchParams.get('cliente_id') ?? ''

  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtrados, setFiltrados] = useState<Veiculo[]>([])
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Veiculo | null>(null)
  const [form, setForm] = useState<Form>(emptyForm(clienteIdParam))
  const [saving, setSaving] = useState(false)

  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      listVeiculos(clienteIdParam || undefined),
      listClientes(),
    ]).then(([vs, cs]) => {
      setVeiculos(vs)
      setFiltrados(vs)
      setClientes(cs)
    }).finally(() => setIsLoading(false))
  }, [clienteIdParam])

  useEffect(() => {
    const q = busca.toLowerCase()
    setFiltrados(
      veiculos.filter(
        (v) =>
          v.marca.toLowerCase().includes(q) ||
          v.modelo.toLowerCase().includes(q) ||
          (v.placa ?? '').toLowerCase().includes(q) ||
          (v.cliente?.name ?? '').toLowerCase().includes(q)
      )
    )
  }, [busca, veiculos])

  function openCriar() {
    setEditando(null)
    setForm(emptyForm(clienteIdParam))
    setShowModal(true)
  }

  function openEditar(v: Veiculo) {
    setEditando(v)
    setForm({
      cliente_id: v.cliente_id,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano?.toString() ?? '',
      placa: v.placa ?? '',
      cor: v.cor ?? '',
      km_entrada: v.km_entrada?.toString() ?? '',
    })
    setShowModal(true)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id || !form.marca || !form.modelo) return
    setSaving(true)
    try {
      const payload = {
        cliente_id: form.cliente_id,
        marca: form.marca,
        modelo: form.modelo,
        ano: form.ano ? Number(form.ano) : undefined,
        placa: form.placa || undefined,
        cor: form.cor || undefined,
        km_entrada: form.km_entrada ? Number(form.km_entrada) : undefined,
      }

      if (editando) {
        const updated = await updateVeiculo(editando.id, payload)
        const cliente = clientes.find((c) => c.id === updated.cliente_id)
        const vWithCliente = { ...updated, cliente: cliente ? { id: cliente.id, name: cliente.name } : editando.cliente }
        setVeiculos((prev) => prev.map((v) => v.id === updated.id ? vWithCliente : v))
        notifySuccess('Veículo atualizado!')
      } else {
        const v = await createVeiculo(payload)
        const cliente = clientes.find((c) => c.id === v.cliente_id)
        const vWithCliente = { ...v, cliente: cliente ? { id: cliente.id, name: cliente.name } : undefined }
        setVeiculos((prev) => [vWithCliente, ...prev])
        notifySuccess('Veículo cadastrado!')
      }
      setShowModal(false)
    } catch {
      notifyError(editando ? 'Erro ao atualizar veículo.' : 'Erro ao cadastrar veículo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletandoId(id)
    try {
      await deleteVeiculo(id)
      setVeiculos((prev) => prev.filter((v) => v.id !== id))
      notifySuccess('Veículo removido.')
    } catch {
      notifyError('Erro ao remover veículo.')
    } finally {
      setDeletandoId(null)
    }
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const selectCls = 'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="mt-1 text-sm text-gray-500">{filtrados.length} {filtrados.length === 1 ? 'veículo' : 'veículos'}</p>
        </div>
        <Button onClick={openCriar}>+ Novo Veículo</Button>
      </div>

      <input
        type="search"
        placeholder="Buscar por placa, modelo, marca, cliente..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <p className="text-sm text-gray-500">Nenhum veículo encontrado</p>
          <button onClick={openCriar} className="mt-3 text-sm text-amber-600 hover:underline">
            Cadastrar veículo
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Placa</th>
                  <th className="px-4 py-3 text-left">Veículo</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Ano / Cor</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">KM entrada</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">{v.placa ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{v.marca} {v.modelo}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {v.ano ?? '—'} {v.cor ? `· ${v.cor}` : ''}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">{v.cliente?.name ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-right text-gray-500 lg:table-cell">
                      {v.km_entrada != null ? v.km_entrada.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditar(v)}
                          className="text-gray-400 hover:text-amber-600 transition-colors"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deletandoId === v.id}
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
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {editando ? 'Editar Veículo' : 'Novo Veículo'}
            </h3>
            <form onSubmit={handleSalvar} className="flex flex-col gap-4">
              {!editando && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Cliente *</label>
                  <select value={form.cliente_id} onChange={set('cliente_id')} className={selectCls} required>
                    <option value="">— Selecionar —</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editando && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <span className="font-medium">Cliente:</span> {editando.cliente?.name ?? '—'}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Marca *" value={form.marca} onChange={set('marca')} placeholder="KIA" required autoFocus={!!editando} />
                <Input label="Modelo *" value={form.modelo} onChange={set('modelo')} placeholder="Bongo" required />
                <Input label="Ano" type="number" value={form.ano} onChange={set('ano')} placeholder="2020" />
                <Input label="Placa" value={form.placa} onChange={set('placa')} placeholder="ABC-1234" />
                <Input label="Cor" value={form.cor} onChange={set('cor')} placeholder="Branco" />
                <Input label="KM entrada" type="number" value={form.km_entrada} onChange={set('km_entrada')} placeholder="85000" />
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
