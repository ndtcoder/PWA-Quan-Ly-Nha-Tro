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
import StaffListPage from './pages/staff/StaffListPage';
import TaskListPage from './pages/tasks/TaskListPage';
import TaskTemplateListPage from './pages/tasks/TaskTemplateListPage';
import TaskTemplateFormPage from './pages/tasks/TaskTemplateFormPage';
import MyTasksPage from './pages/tasks/MyTasksPage';
import InvoiceListPage from './pages/invoices/InvoiceListPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import MeterReadingListPage from './pages/meters/MeterReadingListPage';
import MeterUploadPage from './pages/meters/MeterUploadPage';
import MaintenanceListPage from './pages/maintenance/MaintenanceListPage';
import MaintenanceFormPage from './pages/maintenance/MaintenanceFormPage';
import MaintenanceDetailPage from './pages/maintenance/MaintenanceDetailPage';
import NotificationPage from './pages/notifications/NotificationPage';
import ReportsPage from './pages/reports/ReportsPage';


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
        <Route path="/staff" element={<StaffListPage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/templates" element={<TaskTemplateListPage />} />
        <Route path="/tasks/templates/new" element={<TaskTemplateFormPage />} />
        <Route path="/tasks/templates/:id/edit" element={<TaskTemplateFormPage />} />
        <Route path="/tasks/my-tasks" element={<MyTasksPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/my-invoices" element={<InvoiceListPage />} />
        <Route path="/meters" element={<MeterReadingListPage />} />
        <Route path="/meters/upload" element={<MeterUploadPage />} />
        <Route path="/maintenance" element={<MaintenanceListPage />} />
        <Route path="/maintenance/new" element={<MaintenanceFormPage />} />
        <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
