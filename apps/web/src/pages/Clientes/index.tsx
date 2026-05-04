import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClientes } from '@services/clientes'
import { formatPhone } from '@lib/format'
import { notifySuccess, notifyError } from '@components/Toast'
import type { Cliente } from '@oficina/types'

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtrados, setFiltrados] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    listClientes()
      .then((data) => { setClientes(data); setFiltrados(data) })
      .catch(() => setError('Erro ao carregar clientes.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const q = busca.toLowerCase()
    setFiltrados(
      clientes.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').includes(q) ||
          (c.document ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          (c.email ?? '').toLowerCase().includes(q)
      )
    )
  }, [busca, clientes])

  function copyPortalLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(url)
      .then(() => notifySuccess('Link do portal copiado!'))
      .catch(() => notifyError('Erro ao copiar link.'))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">{filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}</p>
        </div>
        <Link
          to="/clientes/novo"
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Cliente
        </Link>
      </div>

      {/* Busca */}
      <input
        type="search"
        placeholder="Buscar por nome, telefone, CPF/CNPJ..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-500">Nenhum cliente encontrado</p>
          <Link to="/clientes/novo" className="mt-3 text-sm text-amber-600 hover:underline">Cadastrar primeiro cliente</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-amber-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{c.name}</p>
                  {c.phone && <p className="text-sm text-gray-500">{formatPhone(c.phone)}</p>}
                  {c.email && <p className="truncate text-xs text-gray-400">{c.email}</p>}
                  {c.document && <p className="text-xs text-gray-400">Doc: {c.document}</p>}
                </div>
                <button
                  onClick={() => copyPortalLink(c.cliente_token)}
                  title="Copiar link do portal do cliente"
                  className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/ordens?cliente_id=${c.id}`}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Ver OS
                </Link>
                <Link
                  to={`/veiculos?cliente_id=${c.id}`}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Veículos
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
