import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listConversas } from '@services/chat'
import { formatDateTime } from '@lib/format'
import type { Conversa } from '@oficina/types'

export function ChatPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listConversas()
      .then(setConversas)
      .catch(() => setError('Erro ao carregar conversas.'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
        <p className="mt-1 text-sm text-gray-500">Conversas com clientes</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : conversas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-gray-500">Nenhuma conversa ainda</p>
          <p className="mt-1 text-xs text-gray-400">As conversas aparecem ao abrir uma OS com cliente</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {conversas.map((conv) => (
            <Link
              key={conv.id}
              to={`/chat/${conv.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                {(conv.cliente?.name ?? '?')[0].toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{conv.cliente?.name ?? 'Cliente'}</p>
                {conv.ultima_mensagem ? (
                  <p className="truncate text-sm text-gray-400">{conv.ultima_mensagem.content}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nenhuma mensagem</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-400">
                  {conv.ultima_mensagem
                    ? formatDateTime(conv.ultima_mensagem.created_at)
                    : formatDateTime(conv.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
