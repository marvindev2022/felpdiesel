import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listOrdens } from '@services/ordens'
import { formatCurrency, formatDate, osStatusLabel, osStatusColor } from '@lib/format'
import type { OrdemServico, OsStatus } from '@oficina/types'

const STATUS_OPTIONS: { value: '' | OsStatus; label: string }[] = [
  { value: '',               label: 'Todos' },
  { value: 'aberta',         label: 'Aberta' },
  { value: 'em_andamento',   label: 'Em Andamento' },
  { value: 'aguardando_peca',label: 'Aguardando Peça' },
  { value: 'pronta',         label: 'Pronta' },
  { value: 'entregue',       label: 'Entregue' },
  { value: 'cancelada',      label: 'Cancelada' },
]

export function OrdensPage() {
  const navigate = useNavigate()
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [filteredOrdens, setFilteredOrdens] = useState<OrdemServico[]>([])
  const [status, setStatus] = useState<'' | OsStatus>('')
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    listOrdens()
      .then(setOrdens)
      .catch(() => setError('Erro ao carregar ordens de serviço.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    let result = ordens
    if (status) result = result.filter((o) => o.status === status)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      result = result.filter(
        (o) =>
          o.titulo.toLowerCase().includes(q) ||
          String(o.numero).includes(q) ||
          (o.cliente?.name ?? '').toLowerCase().includes(q) ||
          (o.veiculo?.placa ?? '').toLowerCase().includes(q) ||
          (o.veiculo?.modelo ?? '').toLowerCase().includes(q)
      )
    }
    setFilteredOrdens(result)
  }, [ordens, status, busca])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="mt-1 text-sm text-gray-500">{filteredOrdens.length} {filteredOrdens.length === 1 ? 'ordem' : 'ordens'}</p>
        </div>
        <Link
          to="/ordens/nova"
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova OS
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nº, cliente, veículo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : filteredOrdens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500">Nenhuma ordem encontrada</p>
          <Link to="/ordens/nova" className="mt-3 text-sm text-amber-600 hover:underline">Criar primeira OS</Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nº</th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Veículo</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Valor</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrdens.map((os) => (
                  <tr
                    key={os.id}
                    onClick={() => navigate(`/ordens/${os.id}`)}
                    className="hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-amber-600">#{os.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{os.titulo}</td>
                    <td className="hidden px-4 py-3 sm:table-cell text-gray-600">{os.cliente?.name ?? '—'}</td>
                    <td className="hidden px-4 py-3 md:table-cell text-gray-600">
                      {os.veiculo ? `${os.veiculo.placa ?? '—'} · ${os.veiculo.modelo}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${osStatusColor(os.status)}`}>
                        {osStatusLabel(os.status)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right font-medium text-gray-900 lg:table-cell">
                      {formatCurrency(os.valor_total)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-gray-500 md:table-cell">
                      {os.previsao_entrega ? formatDate(os.previsao_entrega) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
