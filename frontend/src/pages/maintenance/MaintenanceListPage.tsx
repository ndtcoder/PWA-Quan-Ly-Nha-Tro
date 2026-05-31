import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMaintenanceRequests } from '../../api/maintenance';
import type { MaintenanceRequest, MaintenanceFilter } from '../../types/maintenance';
import ScopeToggle from '../../components/maintenance/ScopeToggle';

function MaintenanceListPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScope, setActiveScope] = useState<'property' | 'unit'>('property');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [propertyFilter] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: MaintenanceFilter = { scope: activeScope };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (propertyFilter) params.property_id = propertyFilter;
      const data = await getMaintenanceRequests(params);
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch maintenance requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeScope, statusFilter, categoryFilter, priorityFilter, propertyFilter]);

  const propertyScopeCount = requests.filter((r) => r.scope === 'property').length;
  const unitScopeCount = requests.filter((r) => r.scope === 'unit').length;

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 animate-pulse',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      urgent: 'Khẩn cấp',
      high: 'Cao',
      normal: 'Bình thường',
      low: 'Thấp',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[priority] || styles.normal
        }`}
      >
        {labels[priority] || priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      open: 'Mở',
      assigned: 'Đã phân công',
      in_progress: 'Đang thực hiện',
      resolved: 'Đã giải quyết',
      closed: 'Đóng',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || styles.open
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      electrical: '⚡',
      plumbing: '🔧',
      furniture: '🪑',
      structure: '🏗️',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      electrical: 'Điện',
      plumbing: 'Nước',
      furniture: 'Nội thất',
      structure: 'Kết cấu',
      other: 'Khác',
    };
    return labels[category] || category;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bảo trì</h1>
        <Link
          to="/maintenance/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Yêu cầu mới
        </Link>
      </div>

      {/* Scope Toggle */}
      <div className="mb-4">
        <ScopeToggle
          activeScope={activeScope}
          onScopeChange={setActiveScope}
          propertyScopeCount={propertyScopeCount}
          unitScopeCount={unitScopeCount}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trạng thái
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="open">Mở</option>
            <option value="assigned">Đã phân công</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="resolved">Đã giải quyết</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh mục
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="electrical">Điện</option>
            <option value="plumbing">Nước</option>
            <option value="furniture">Nội thất</option>
            <option value="structure">Kết cấu</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mức ưu tiên
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="normal">Bình thường</option>
            <option value="high">Cao</option>
            <option value="urgent">Khẩn cấp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có yêu cầu bảo trì nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tiêu đề
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {activeScope === 'property' ? 'Nhà' : 'Phòng'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Danh mục
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mức ưu tiên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Người phụ trách
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày tạo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/maintenance/${request.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {request.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {activeScope === 'property'
                        ? request.property_name || '-'
                        : request.unit_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="mr-1">{getCategoryIcon(request.category)}</span>
                      {getCategoryLabel(request.category)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getPriorityBadge(request.priority)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {request.assigned_to_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString('vi-VN')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenanceListPage;
