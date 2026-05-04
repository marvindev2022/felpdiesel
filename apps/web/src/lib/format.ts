import type { OsStatus } from '@oficina/types'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(date.includes('T') ? date : date + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPhone(phone: string): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function formatPlaca(placa: string): string {
  if (!placa) return '—'
  const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Mercosul: AAA1A23
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p)) {
    return `${p.slice(0, 3)}${p.slice(3, 4)}${p.slice(4, 5)}${p.slice(5)}`
  }
  // Padrão antigo: AAA-1234
  if (/^[A-Z]{3}[0-9]{4}$/.test(p)) {
    return `${p.slice(0, 3)}-${p.slice(3)}`
  }
  return placa
}

export function osStatusLabel(status: OsStatus): string {
  const labels: Record<OsStatus, string> = {
    aberta:           'Aberta',
    em_andamento:     'Em Andamento',
    aguardando_peca:  'Aguardando Peça',
    pronta:           'Pronta',
    entregue:         'Entregue',
    cancelada:        'Cancelada',
  }
  return labels[status] ?? status
}

export function osStatusColor(status: OsStatus): string {
  const colors: Record<OsStatus, string> = {
    aberta:           'bg-yellow-100 text-yellow-700',
    em_andamento:     'bg-blue-100 text-blue-700',
    aguardando_peca:  'bg-orange-100 text-orange-700',
    pronta:           'bg-green-100 text-green-700',
    entregue:         'bg-gray-100 text-gray-600',
    cancelada:        'bg-red-100 text-red-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}
