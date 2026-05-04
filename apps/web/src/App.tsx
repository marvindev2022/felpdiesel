import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@contexts/auth'
import { ToastContainer } from '@components/Toast'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastContainer />
    </AuthProvider>
  )
}
