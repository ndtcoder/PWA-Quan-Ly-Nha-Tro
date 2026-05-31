import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaff, inviteStaff, deactivateStaff } from '../../api/staff';
import type { StaffInvite } from '../../types/task';

const roleBadgeColors: Record<string, string> = {
  manager: 'bg-blue-100 text-blue-700',
  accountant: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-orange-100 text-orange-700',
  cleaner: 'bg-purple-100 text-purple-700',
};

const roleLabels: Record<string, string> = {
  manager: 'Quản lý',
  accountant: 'Kế toán',
  maintenance: 'Bảo trì',
  cleaner: 'Vệ sinh',
};

export default function StaffListPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<StaffInvite>({
    email: '',
    role: 'maintenance',
  });
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaff(),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'maintenance' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(inviteForm);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nhân viên</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Mời nhân viên
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Chưa có nhân viên nào.</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà phụ trách</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[member.role] || 'bg-gray-100 text-gray-700'}`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.assigned_properties.length > 0
                      ? member.assigned_properties.join(', ')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Ngừng hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {member.is_active && (
                      <button
                        onClick={() => deactivateMutation.mutate(member.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Vô hiệu hóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal mời */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Mời nhân viên</h2>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as StaffInvite['role'] })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="manager">Quản lý</option>
                  <option value="accountant">Kế toán</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="cleaner">Vệ sinh</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
