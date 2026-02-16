import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import LoginPage from '@/pages/login'
import DashboardPage from '@/pages/dashboard'
import RequestsPage from '@/pages/requests/index'
import RequestDetailPage from '@/pages/requests/[id]'
import NewRequestPage from '@/pages/requests/new'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/solicitudes" element={<RequestsPage />} />
              <Route path="/solicitudes/nueva" element={<NewRequestPage />} />
              <Route path="/solicitudes/:id" element={<RequestDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
