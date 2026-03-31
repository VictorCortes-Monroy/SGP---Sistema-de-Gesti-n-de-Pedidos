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
import BudgetsPage from '@/pages/budgets'
import AuditPage from '@/pages/admin/audit'
import UsuariosPage from '@/pages/admin/usuarios'
import EmpresasPage from '@/pages/admin/empresas'
import CentrosCostoPage from '@/pages/admin/centros-costo'
import MatrizAprobacionPage from '@/pages/admin/matriz-aprobacion'
import { EquipmentPage } from '@/pages/maintenance/equipment'
import NewEquipmentPage from '@/pages/maintenance/equipment/new'
import EquipmentDetailPage from '@/pages/maintenance/equipment/[id]'
import MaintenanceDashboard from '@/pages/maintenance/index'
import MaintenanceRequestsPage from '@/pages/maintenance/requests/index'
import NewMaintenanceRequestPage from '@/pages/maintenance/requests/new'
import MaintenanceRequestDetailPage from '@/pages/maintenance/requests/[id]'
import MaintenanceAlertsPage from '@/pages/maintenance/alerts'

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
              <Route path="/presupuestos" element={<BudgetsPage />} />
              <Route path="/admin/auditoria" element={<AuditPage />} />
              <Route path="/admin/usuarios" element={<UsuariosPage />} />
              <Route path="/admin/empresas" element={<EmpresasPage />} />
              <Route path="/admin/centros-costo" element={<CentrosCostoPage />} />
              <Route path="/admin/matriz-aprobacion" element={<MatrizAprobacionPage />} />

              {/* Maintenance module */}
              <Route path="/equipos" element={<EquipmentPage />} />
              <Route path="/equipos/nuevo" element={<NewEquipmentPage />} />
              <Route path="/equipos/:id" element={<EquipmentDetailPage />} />
              <Route path="/mantencion" element={<MaintenanceDashboard />} />
              <Route path="/mantencion/solicitudes" element={<MaintenanceRequestsPage />} />
              <Route path="/mantencion/solicitudes/nueva" element={<NewMaintenanceRequestPage />} />
              <Route path="/mantencion/solicitudes/:id" element={<MaintenanceRequestDetailPage />} />
              <Route path="/mantencion/alertas" element={<MaintenanceAlertsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
