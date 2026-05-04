import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listVeiculos, createVeiculo, deleteVeiculo } from '@services/veiculos'
import { listClientes } from '@services/clientes'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Input } from '@oficina/ui'
import type { Veiculo, Cliente } from '@oficina/types'

export function VeiculosPage() {
  const [searchParams] = useSearchParams()
  const clienteIdParam = searchParams.get('cliente_id') ?? ''

  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtrados, setFiltrados] = useState<Veiculo[]>([])
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    cliente_id: clienteIdParam,
    marca: '', modelo: '', ano: '', placa: '', cor: '', km_entrada: '',
  })
  const [saving, setSaving] = useState(false)

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id || !form.marca || !form.modelo) return
    setSaving(true)
    try {
      const v = await createVeiculo({
        cliente_id: form.cliente_id,
        marca: form.marca,
        modelo: form.modelo,
        ano: form.ano ? Number(form.ano) : undefined,
        placa: form.placa || undefined,
        cor: form.cor || undefined,
        km_entrada: form.km_entrada ? Number(form.km_entrada) : undefined,
      })
      const cliente = clientes.find((c) => c.id === v.cliente_id)
      const vWithCliente = { ...v, cliente: cliente ? { id: cliente.id, name: cliente.name } : undefined }
      setVeiculos((prev) => [vWithCliente, ...prev])
      setForm({ cliente_id: clienteIdParam, marca: '', modelo: '', ano: '', placa: '', cor: '', km_entrada: '' })
      setShowModal(false)
      notifySuccess('Veículo cadastrado!')
    } catch {
      notifyError('Erro ao cadastrar veículo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVeiculo(id)
      setVeiculos((prev) => prev.filter((v) => v.id !== id))
      notifySuccess('Veículo removido.')
    } catch {
      notifyError('Erro ao remover veículo.')
    }
  }

  const selectCls = 'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="mt-1 text-sm text-gray-500">{filtrados.length} {filtrados.length === 1 ? 'veículo' : 'veículos'}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Novo Veículo</Button>
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
          <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-amber-600 hover:underline">
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
                  <th className="px-4 py-3" />
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Remover veículo"
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
        </div>
      )}

      {/* Modal novo veículo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Novo Veículo</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Cliente *</label>
                <select
                  value={form.cliente_id}
                  onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))}
                  className={selectCls}
                  required
                >
                  <option value="">— Selecionar —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Marca *" value={form.marca} onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Honda" required />
                <Input label="Modelo *" value={form.modelo} onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))} placeholder="Civic" required />
                <Input label="Ano" type="number" value={form.ano} onChange={(e) => setForm((p) => ({ ...p, ano: e.target.value }))} placeholder="2020" />
                <Input label="Placa" value={form.placa} onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value }))} placeholder="ABC-1234" />
                <Input label="Cor" value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} placeholder="Prata" />
                <Input label="KM entrada" type="number" value={form.km_entrada} onChange={(e) => setForm((p) => ({ ...p, km_entrada: e.target.value }))} placeholder="85000" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" isLoading={saving} className="flex-1">Cadastrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
