import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Dashboard,
  Login,
  Clientes,
  ClienteDetalhes,
  Apolices,
  ApoliceDetalhes,
  Sinistros,
  SinistroDetalhes,
  Cotacoes,
  CotacaoDetalhes,
  PropostaDetalhes,
  Financeiro,
  Agenda,
  Alertas,
  WhatsApp,
  WhatsAppCRM,
  Importacao,
  Configuracoes,
  // Novos modulos
  Consorcios,
  ConsorcioDetalhes,
  PlanosSaude,
  PlanoSaudeDetalhes,
  Financiamentos,
  FinanciamentoDetalhes,
} from "./pages";
import { useAuthStore } from "./store/authStore";
import { useRealtimeNotifications } from "./hooks/useRealtime";
import { ErrorBoundary, ToastContainer } from "./components/common";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  // Ativar notificacoes em tempo real quando autenticado
  useRealtimeNotifications();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <WhatsAppCRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes/:id"
              element={
                <ProtectedRoute>
                  <ClienteDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotacoes"
              element={
                <ProtectedRoute>
                  <Cotacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotacoes/nova"
              element={
                <ProtectedRoute>
                  <CotacaoDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotacoes/:id"
              element={
                <ProtectedRoute>
                  <CotacaoDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/propostas/:id"
              element={
                <ProtectedRoute>
                  <PropostaDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apolices"
              element={
                <ProtectedRoute>
                  <Apolices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apolices/:id"
              element={
                <ProtectedRoute>
                  <ApoliceDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sinistros"
              element={
                <ProtectedRoute>
                  <Sinistros />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sinistros/:id"
              element={
                <ProtectedRoute>
                  <SinistroDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alertas"
              element={
                <ProtectedRoute>
                  <Alertas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importar"
              element={
                <ProtectedRoute>
                  <Importacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/whatsapp"
              element={
                <ProtectedRoute>
                  <WhatsApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />

            {/* Novos Modulos */}
            <Route
              path="/consorcios"
              element={
                <ProtectedRoute>
                  <Consorcios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consorcios/:id"
              element={
                <ProtectedRoute>
                  <ConsorcioDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos-saude"
              element={
                <ProtectedRoute>
                  <PlanosSaude />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos-saude/:id"
              element={
                <ProtectedRoute>
                  <PlanoSaudeDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financiamentos"
              element={
                <ProtectedRoute>
                  <Financiamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financiamentos/:id"
              element={
                <ProtectedRoute>
                  <FinanciamentoDetalhes />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast Notifications */}
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
