import { useState, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let toastListeners: ((toasts: ToastItem[]) => void)[] = []

export const toastStore = {
  toasts: [] as ToastItem[],
  addToast(message: string, timeOut: number, type: ToastType) {
    const id = Date.now()
    this.toasts = [...this.toasts, { id, message, type }]
    toastListeners.forEach((l) => l(this.toasts))
    setTimeout(() => this.removeToast(id), timeOut)
    return id
  },
  removeToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    toastListeners.forEach((l) => l(this.toasts))
  },
  updateToast(id: number, message: string, type: ToastType) {
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, message, type } : t))
    toastListeners.forEach((l) => l(this.toasts))
  },
  subscribe(listener: (toasts: ToastItem[]) => void) {
    toastListeners.push(listener)
    return () => { toastListeners = toastListeners.filter((l) => l !== listener) }
  },
}

export const notifySuccess = (message: string, timeOut = 4000) => toastStore.addToast(message, timeOut, 'success')
export const notifyError   = (message: string, timeOut = 5000) => toastStore.addToast(message, timeOut, 'error')
export const notifyWarning = (message: string, timeOut = 4000) => toastStore.addToast(message, timeOut, 'warning')
export const notifyInfo    = (message: string, timeOut = 4000) => toastStore.addToast(message, timeOut, 'info')

export const notifyPromise = ({
  promise,
  loadingMessage,
  successMessage,
  errorMessage,
  timeOut,
}: {
  promise: Promise<unknown>
  loadingMessage: string
  successMessage: string
  errorMessage: string
  timeOut?: number
}): Promise<unknown> => {
  const id = toastStore.addToast(loadingMessage, 100_000, 'info')
  return promise
    .then((r) => { toastStore.updateToast(id, successMessage, 'success'); setTimeout(() => toastStore.removeToast(id), timeOut ?? 4000); return r })
    .catch((e) => { toastStore.updateToast(id, errorMessage, 'error'); setTimeout(() => toastStore.removeToast(id), timeOut ?? 5000); return Promise.reject(e) })
}

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const borders: Record<ToastType, string> = {
  success: 'border-green-500',
  error:   'border-red-500',
  warning: 'border-amber-500',
  info:    'border-amber-500',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsub = toastStore.subscribe(setToasts)
    return unsub
  }, [])

  return (
    <div className="fixed bottom-5 right-5 z-[9998] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-xl border-l-4 bg-white px-4 py-3 shadow-lg ${borders[toast.type]}`}
        >
          {icons[toast.type]}
          <span className="max-w-xs text-sm text-gray-800">{toast.message}</span>
          <button
            onClick={() => toastStore.removeToast(toast.id)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
