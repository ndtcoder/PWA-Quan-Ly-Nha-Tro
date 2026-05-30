import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import DashboardPage from './pages/DashboardPage';
import PropertyListPage from './pages/properties/PropertyListPage';
import PropertyDetailPage from './pages/properties/PropertyDetailPage';
import PropertyFormPage from './pages/properties/PropertyFormPage';
import UnitDetailPage from './pages/units/UnitDetailPage';
import ContractListPage from './pages/contracts/ContractListPage';
import ContractFormPage from './pages/contracts/ContractFormPage';
import ContractDetailPage from './pages/contracts/ContractDetailPage';
import RenterListPage from './pages/renters/RenterListPage';
import RenterDetailPage from './pages/renters/RenterDetailPage';
import RenterFormPage from './pages/renters/RenterFormPage';

// Placeholder pages for app routes
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">This page is under construction.</p>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
      </Route>

      {/* App routes (protected) */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/properties" element={<PropertyListPage />} />
        <Route path="/properties/new" element={<PropertyFormPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
        <Route path="/units/:id" element={<UnitDetailPage />} />
        <Route path="/contracts" element={<ContractListPage />} />
        <Route path="/contracts/new" element={<ContractFormPage />} />
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
        <Route path="/renters" element={<RenterListPage />} />
        <Route path="/renters/new" element={<RenterFormPage />} />
        <Route path="/renters/:id" element={<RenterDetailPage />} />
        <Route path="/renters/:id/edit" element={<RenterFormPage />} />
        <Route path="/staff" element={<PlaceholderPage title="Staff" />} />
        <Route path="/tasks" element={<PlaceholderPage title="Tasks" />} />
        <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
        <Route path="/meters" element={<PlaceholderPage title="Meters" />} />
        <Route path="/maintenance" element={<PlaceholderPage title="Maintenance" />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="/notifications" element={<PlaceholderPage title="Notifications" />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
