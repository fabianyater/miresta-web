import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { setNavigate } from '@/lib/navigation'
import { Toaster } from '@/components/ui/Toaster'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'

import LoginPage from '@/pages/auth/LoginPage'
import MesasPage from '@/pages/mesas/MesasPage'
import PedidosPage from '@/pages/pedido/PedidosPage'
import TomarPedidoPage from '@/pages/pedido/TomarPedidoPage'
import PedidoDetallePage from '@/pages/pedido/PedidoDetallePage'
import ClientesPage from '@/pages/clientes/ClientesPage'
import ClienteDetallePage from '@/pages/clientes/ClienteDetallePage'
import CocinaPage from '@/pages/cocina/CocinaPage'
import ConfigPage from '@/pages/config/ConfigPage'
import AdminHomePage from '@/pages/admin/AdminHomePage'
import UsuariosPage from '@/pages/admin/UsuariosPage'
import PreciosPage from '@/pages/admin/PreciosPage'
import CatalogoPage from '@/pages/admin/CatalogoPage'
import MenuPage from '@/pages/admin/MenuPage'
import ReportesPage from '@/pages/admin/ReportesPage'
import ImpresoraPage from '@/pages/admin/ImpresoraPage'
import FrasesCocinaPage from '@/pages/admin/FrasesCocinaPage'
import CajaPage from '@/pages/admin/CajaPage'
import SalonesPage from '@/pages/admin/SalonesPage'
import RolesPermisosPage from '@/pages/admin/RolesPermisosPage'

// Registers react-router's navigate() so code outside the tree (the axios
// interceptor, on a 401) can redirect without a hard page reload.
function NavigationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    setNavigate((path) => navigate(path, { replace: true }))
  }, [navigate])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <NavigationBridge />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/cocina" element={<CocinaPage />} />

            <Route element={<AppLayout />}>
              <Route path="/mesas" element={<MesasPage />} />
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route path="/pedido/mesa/:tableId" element={<TomarPedidoPage />} />
              <Route path="/pedido/nuevo" element={<TomarPedidoPage />} />
              <Route path="/pedido/:orderId" element={<PedidoDetallePage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:customerId" element={<ClienteDetallePage />} />
              <Route path="/config" element={<ConfigPage />} />

              <Route path="/admin" element={<AdminHomePage />} />

              <Route element={<ProtectedRoute permission="USUARIOS_VER" />}>
                <Route path="/admin/usuarios" element={<UsuariosPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="PRECIOS_VER" />}>
                <Route path="/admin/precios" element={<PreciosPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="CATALOGO_EDITAR" />}>
                <Route path="/admin/catalogo" element={<CatalogoPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="MENU_EDITAR" />}>
                <Route path="/admin/menu" element={<MenuPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="PEDIDOS_REPORTES" />}>
                <Route path="/admin/reportes" element={<ReportesPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="IMPRESORA_CONFIG" />}>
                <Route path="/admin/impresora" element={<ImpresoraPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="COCINA_FRASES_EDITAR" />}>
                <Route path="/admin/frases-cocina" element={<FrasesCocinaPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="CAJA_EDITAR" />}>
                <Route path="/admin/caja" element={<CajaPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="SALONES_EDITAR" />}>
                <Route path="/admin/salones" element={<SalonesPage />} />
              </Route>
              <Route element={<ProtectedRoute roles={['OWNER']} />}>
                <Route path="/admin/roles-permisos" element={<RolesPermisosPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/mesas" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
