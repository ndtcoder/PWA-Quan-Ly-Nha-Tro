import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';

// Lazy-loaded page components for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PropertyListPage = lazy(() => import('./pages/properties/PropertyListPage'));
const PropertyDetailPage = lazy(() => import('./pages/properties/PropertyDetailPage'));
const PropertyFormPage = lazy(() => import('./pages/properties/PropertyFormPage'));
const UnitDetailPage = lazy(() => import('./pages/units/UnitDetailPage'));
const ContractListPage = lazy(() => import('./pages/contracts/ContractListPage'));
const ContractFormPage = lazy(() => import('./pages/contracts/ContractFormPage'));
const ContractDetailPage = lazy(() => import('./pages/contracts/ContractDetailPage'));
const RenterListPage = lazy(() => import('./pages/renters/RenterListPage'));
const RenterDetailPage = lazy(() => import('./pages/renters/RenterDetailPage'));
const RenterFormPage = lazy(() => import('./pages/renters/RenterFormPage'));
const StaffListPage = lazy(() => import('./pages/staff/StaffListPage'));
const TaskListPage = lazy(() => import('./pages/tasks/TaskListPage'));
const TaskTemplateListPage = lazy(() => import('./pages/tasks/TaskTemplateListPage'));
const TaskTemplateFormPage = lazy(() => import('./pages/tasks/TaskTemplateFormPage'));
const MyTasksPage = lazy(() => import('./pages/tasks/MyTasksPage'));
const InvoiceListPage = lazy(() => import('./pages/invoices/InvoiceListPage'));
const InvoiceDetailPage = lazy(() => import('./pages/invoices/InvoiceDetailPage'));
const MeterReadingListPage = lazy(() => import('./pages/meters/MeterReadingListPage'));
const MeterUploadPage = lazy(() => import('./pages/meters/MeterUploadPage'));
const MaintenanceListPage = lazy(() => import('./pages/maintenance/MaintenanceListPage'));
const MaintenanceFormPage = lazy(() => import('./pages/maintenance/MaintenanceFormPage'));
const MaintenanceDetailPage = lazy(() => import('./pages/maintenance/MaintenanceDetailPage'));
const NotificationPage = lazy(() => import('./pages/notifications/NotificationPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const OrganizationSetupPage = lazy(() => import('./pages/onboarding/OrganizationSetupPage'));
const OrganizationSettingsPage = lazy(() => import('./pages/settings/OrganizationSettingsPage'));


function App() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
        </Route>

        {/* OAuth callback (no layout needed) */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Organization setup (no layout needed, shown after Google sign-up) */}
        <Route path="/organization-setup" element={<OrganizationSetupPage />} />

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
          <Route path="/settings/organization" element={<OrganizationSettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
