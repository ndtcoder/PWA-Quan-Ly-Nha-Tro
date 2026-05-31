import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary-600">My Home</h2>
          <p className="text-sm text-gray-600 mt-1">Hệ thống Quản lý Lưu Trú</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
