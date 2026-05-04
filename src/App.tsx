import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AgendaClientes } from '@/pages/AgendaClientes';
import { CrmKanban } from '@/pages/CrmKanban';
import { Dashboard } from '@/pages/Dashboard';
import { AnalisePerfil } from '@/pages/AnalisePerfil';
import { ProgramacaoCompras } from '@/pages/ProgramacaoCompras';
import { AdminPainel } from '@/pages/AdminPainel';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CrmKanban />} />
        <Route path="agenda" element={<AgendaClientes />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analise-perfil" element={<AnalisePerfil />} />
        <Route path="programacao-compras" element={<ProgramacaoCompras />} />
        <Route path="admin" element={<AdminPainel />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
