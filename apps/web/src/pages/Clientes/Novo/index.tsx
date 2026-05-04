import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCliente } from '@services/clientes'
import { notifySuccess, notifyError } from '@components/Toast'
import { Button, Input } from '@oficina/ui'

export function NovoClientePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    document: '',
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function validate() {
    const errs: Partial<typeof form> = {}
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setIsLoading(true)
    try {
      await createCliente({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        document: form.document.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      notifySuccess('Cliente cadastrado!')
      navigate('/clientes')
    } catch {
      notifyError('Erro ao cadastrar cliente.')
    } finally {
      setIsLoading(false)
    }
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }))
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
        <p className="mt-1 text-sm text-gray-500">Preencha os dados do cliente</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Input
          label="Nome *"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="Nome completo"
          autoFocus
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={set('phone')}
          placeholder="(11) 99999-9999"
          type="tel"
        />
        <Input
          label="E-mail"
          value={form.email}
          onChange={set('email')}
          placeholder="cliente@email.com"
          type="email"
        />
        <Input
          label="CPF / CNPJ"
          value={form.document}
          onChange={set('document')}
          placeholder="000.000.000-00"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Observações</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Informações adicionais sobre o cliente..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/clientes')} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">
            Cadastrar
          </Button>
        </div>
      </form>
    </div>
  )
}
