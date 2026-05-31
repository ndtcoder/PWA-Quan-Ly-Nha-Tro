import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getProperties } from '../api/properties';
import { getContracts } from '../api/contracts';
import { getTasks } from '../api/tasks';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: properties, isLoading: loadingProperties, isError: errorProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  });

  const { data: contracts, isLoading: loadingContracts, isError: errorContracts } = useQuery({
    queryKey: ['contracts', { status: 'active' }],
    queryFn: () => getContracts({ status: 'active' }),
  });

  const { data: tasks, isLoading: loadingTasks, isError: errorTasks } = useQuery({
    queryKey: ['tasks', { status: 'pending' }],
    queryFn: () => getTasks({ status: 'pending' }),
  });

  const isLoading = loadingProperties || loadingContracts || loadingTasks;
  const isError = errorProperties || errorContracts || errorTasks;

  const propertyCount = properties?.length ?? 0;
  const totalUnits = properties?.reduce((sum, p) => sum + (p.total_units || 0), 0) ?? 0;
  const activeContracts = contracts?.length ?? 0;
  const pendingTasks = tasks?.length ?? 0;

  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Tổng quan{user?.full_name ? ` - ${user.full_name}` : ''}
        </h1>
        <p className="text-red-600">Không thể tải dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Tổng quan{user?.full_name ? ` - ${user.full_name}` : ''}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Nhà cho thuê</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '...' : propertyCount}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Tổng số phòng</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '...' : totalUnits}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Hợp đồng đang hiệu lực</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '...' : activeContracts}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Công việc chờ xử lý</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '...' : pendingTasks}
          </p>
        </div>
      </div>
    </div>
  );
}
