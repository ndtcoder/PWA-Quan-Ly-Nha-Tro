import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createStaff } from '../../api/staff';
import { getProperties } from '../../api/properties';
import type { StaffCreate } from '../../types/task';

export default function StaffFormPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<StaffCreate>({
    email: '',
    full_name: '',
    phone: '',
    role: 'maintenance',
    property_id: '',
    address: '',
    notes: '',
  });

  const [error, setError] = useState('');

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  });

  const createMutation = useMutation({
    mutationFn: (data: StaffCreate) => createStaff(data),
    onSuccess: () => {
      alert('Đã thêm nhân viên thành công');
      navigate('/staff');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload: StaffCreate = {
      email: form.email,
      full_name: form.full_name,
      role: form.role,
    };
    if (form.phone) payload.phone = form.phone;
    if (form.property_id) payload.property_id = form.property_id;
    if (form.address) payload.address = form.address;
    if (form.notes) payload.notes = form.notes;
    createMutation.mutate(payload);
  };

  const updateField = (field: keyof StaffCreate, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/staff')} className="text-gray-500 hover:text-gray-700">
          &larr; Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Thêm nhân viên mới</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (bắt buộc)</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên (bắt buộc)</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <select
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="manager">Quản lý</option>
              <option value="accountant">Kế toán</option>
              <option value="maintenance">Bảo trì</option>
              <option value="cleaner">Vệ sinh</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà phụ trách</label>
            <select
              value={form.property_id}
              onChange={(e) => updateField('property_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Chọn nhà...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
            placeholder="Ghi chú về nhân viên..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Đang thêm...' : 'Thêm nhân viên'}
          </button>
        </div>
      </form>
    </div>
  );
}
