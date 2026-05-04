import { createBrowserRouter, redirect } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import { AppLayout } from '@pages/Layout/AppLayout'
import { AuthPage } from '@pages/Auth'
import { DashboardPage } from '@pages/Dashboard'
import { OrdensPage } from '@pages/Ordens'
import { NovaOrdemPage } from '@pages/Ordens/Nova'
import { OrdemDetailPage } from '@pages/Ordens/Detail'
import { ClientesPage } from '@pages/Clientes'
import { NovoClientePage } from '@pages/Clientes/Novo'
import { VeiculosPage } from '@pages/Veiculos'
import { ChatPage } from '@pages/Chat'
import { ChatDetailPage } from '@pages/Chat/Detail'
import { PortalPage } from '@pages/Portal'

async function requireAuth() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw redirect('/login')
  return null
}

async function redirectIfAuth() {
  const { data } = await supabase.auth.getSession()
  if (data.session) throw redirect('/dashboard')
  return null
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage />,
    loader: redirectIfAuth,
  },
  {
    path: '/',
    element: <AppLayout />,
    loader: requireAuth,
    children: [
      { index: true, loader: async () => redirect('/dashboard') },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ordens', element: <OrdensPage /> },
      { path: 'ordens/nova', element: <NovaOrdemPage /> },
      { path: 'ordens/:id', element: <OrdemDetailPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'clientes/novo', element: <NovoClientePage /> },
      { path: 'veiculos', element: <VeiculosPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:id', element: <ChatDetailPage /> },
    ],
  },
  {
    path: '/portal/:token',
    element: <PortalPage />,
  },
])
