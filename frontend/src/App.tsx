import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-white shadow-sm hidden md:block">
        <div className="p-4 font-bold text-primary-600">Nha Tro</div>
        <nav className="p-2">
          <p className="text-sm text-gray-500 p-2">Menu placeholder</p>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

function LoginPage() {
  return <h1 className="text-2xl font-bold">Login</h1>;
}

function RegisterPage() {
  return <h1 className="text-2xl font-bold">Register</h1>;
}

function DashboardPage() {
  return <h1 className="text-2xl font-bold">Dashboard</h1>;
}

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
