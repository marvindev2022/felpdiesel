import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '@services/ordens'
import { listOrdens } from '@services/ordens'
import { formatCurrency, formatDateTime, osStatusLabel, osStatusColor } from '@lib/format'
import { Badge } from '@oficina/ui'
import type { OrdemServico } from '@oficina/types'

interface Stats {
  counts: Record<string, number>
  entreguesHoje: number
  totalDia: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentes, setRecentes] = useState<OrdemServico[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([getStats(), listOrdens()])
      .then(([s, ordens]) => {
        setStats(s)
        setRecentes(ordens.slice(0, 10))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const metrics = stats
    ? [
        { label: 'OS Abertas',      value: stats.counts.aberta ?? 0,          color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Em Andamento',    value: stats.counts.em_andamento ?? 0,     color: 'text-blue-600',   bg: 'bg-blue-50' },
        { label: 'Prontas',         value: stats.counts.pronta ?? 0,           color: 'text-green-600',  bg: 'bg-green-50' },
        { label: 'Entregues Hoje',  value: stats.entreguesHoje,                color: 'text-amber-600',  bg: 'bg-amber-50' },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral da oficina</p>
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

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className={`rounded-xl ${m.bg} p-4`}>
                <p className="text-xs font-medium text-gray-500">{m.label}</p>
                <p className={`mt-1 text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Receita do dia */}
          {stats && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-700">Receita entregue hoje</p>
              <p className="text-3xl font-bold text-amber-800">{formatCurrency(stats.totalDia)}</p>
            </div>
          )}

          {/* Últimas ordens */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-900">Últimas Ordens de Serviço</h2>
              <Link to="/ordens" className="text-sm text-amber-600 hover:underline">Ver todas</Link>
            </div>

            {recentes.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">Nenhuma ordem de serviço cadastrada.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentes.map((os) => (
                  <Link
                    key={os.id}
                    to={`/ordens/${os.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-600">
                        #{os.numero}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{os.titulo}</p>
                        <p className="truncate text-xs text-gray-400">
                          {os.cliente?.name ?? '—'} {os.veiculo ? `· ${os.veiculo.placa ?? os.veiculo.modelo}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 ml-4">
                      <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${osStatusColor(os.status)}`}>
                        {osStatusLabel(os.status)}
                      </span>
                      <Badge variant={os.status} className="sm:hidden">{osStatusLabel(os.status)}</Badge>
                      <span className="hidden text-xs text-gray-400 md:block">{formatDateTime(os.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
