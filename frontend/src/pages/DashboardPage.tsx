import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Tổng quan{user?.full_name ? ` - ${user.full_name}` : ''}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Nhà cho thuê</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Tổng số phòng</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Hợp đồng đang hiệu lực</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Công việc chờ xử lý</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>
      </div>
    </div>
  );
}
