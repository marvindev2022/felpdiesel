import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClientes } from '@services/clientes'
import { listVeiculos, createVeiculo } from '@services/veiculos'
import { createOrdem } from '@services/ordens'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Input } from '@oficina/ui'
import type { Cliente, Veiculo } from '@oficina/types'

export function NovaOrdemPage() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [clienteId, setClienteId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [kmEntrada, setKmEntrada] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])
  const [previsao, setPrevisao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [novoVeiculo, setNovoVeiculo] = useState(false)
  const [nv, setNv] = useState({ marca: '', modelo: '', ano: '', placa: '', cor: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [clienteBusca, setClienteBusca] = useState('')

  useEffect(() => {
    listClientes().then(setClientes)
  }, [])

  useEffect(() => {
    if (!clienteId) { setVeiculos([]); setVeiculoId(''); return }
    listVeiculos(clienteId).then(setVeiculos)
    setVeiculoId('')
  }, [clienteId])

  const clientesFiltrados = clientes.filter((c) =>
    c.name.toLowerCase().includes(clienteBusca.toLowerCase()) ||
    (c.phone ?? '').includes(clienteBusca)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setIsLoading(true)
    try {
      let vidFinal = veiculoId || undefined

      if (novoVeiculo && clienteId && nv.marca && nv.modelo) {
        const v = await createVeiculo({
          cliente_id: clienteId,
          marca: nv.marca,
          modelo: nv.modelo,
          ano: nv.ano ? Number(nv.ano) : undefined,
          placa: nv.placa || undefined,
          cor: nv.cor || undefined,
          km_entrada: kmEntrada ? Number(kmEntrada) : undefined,
        })
        vidFinal = v.id
      }

      const os = await createOrdem({
        cliente_id: clienteId || undefined,
        veiculo_id: vidFinal,
        titulo,
        km_entrada: kmEntrada ? Number(kmEntrada) : undefined,
        data_entrada: dataEntrada || undefined,
        previsao_entrega: previsao || undefined,
        observacoes: observacoes || undefined,
      })
      notifySuccess('Ordem de serviço criada!')
      navigate(`/ordens/${os.id}`)
    } catch {
      notifyError('Erro ao criar ordem de serviço.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectCls = 'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
        <p className="mt-1 text-sm text-gray-500">Preencha os dados para abrir a OS</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Título */}
        <Input
          label="Título da OS *"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Revisão completa, Troca de freios..."
          required
        />

        {/* Cliente */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <input
            type="search"
            placeholder="Buscar cliente por nome ou telefone..."
            value={clienteBusca}
            onChange={(e) => setClienteBusca(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs focus:border-amber-500 focus:outline-none"
          />
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={selectCls}>
            <option value="">— Selecionar cliente —</option>
            {clientesFiltrados.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Veículo */}
        {clienteId && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Veículo</label>
              <button
                type="button"
                onClick={() => setNovoVeiculo((v) => !v)}
                className="text-xs text-amber-600 hover:underline"
              >
                {novoVeiculo ? 'Selecionar existente' : '+ Novo veículo'}
              </button>
            </div>

            {novoVeiculo ? (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <Input label="Marca *" value={nv.marca} onChange={(e) => setNv((p) => ({ ...p, marca: e.target.value }))} placeholder="Ex: Honda" />
                <Input label="Modelo *" value={nv.modelo} onChange={(e) => setNv((p) => ({ ...p, modelo: e.target.value }))} placeholder="Ex: Civic" />
                <Input label="Ano" value={nv.ano} onChange={(e) => setNv((p) => ({ ...p, ano: e.target.value }))} placeholder="2020" type="number" />
                <Input label="Placa" value={nv.placa} onChange={(e) => setNv((p) => ({ ...p, placa: e.target.value }))} placeholder="ABC-1234" />
                <Input label="Cor" value={nv.cor} onChange={(e) => setNv((p) => ({ ...p, cor: e.target.value }))} placeholder="Prata" className="col-span-2" />
              </div>
            ) : (
              <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className={selectCls}>
                <option value="">— Selecionar veículo —</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.placa ? `· ${v.placa}` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Datas e KM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Data de Entrada *</label>
            <input
              type="date"
              value={dataEntrada}
              onChange={(e) => setDataEntrada(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Previsão de Entrega</label>
            <input
              type="date"
              value={previsao}
              onChange={(e) => setPrevisao(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <Input
            label="KM de Entrada"
            type="number"
            value={kmEntrada}
            onChange={(e) => setKmEntrada(e.target.value)}
            placeholder="Ex: 85000"
          />
        </div>

        {/* Observações */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            placeholder="Detalhes sobre o problema relatado..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/ordens')} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!titulo.trim()} className="flex-1">
            Criar OS
          </Button>
        </div>
      </form>
    </div>
  )
}
