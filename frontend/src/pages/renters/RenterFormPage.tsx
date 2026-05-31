import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRenter, createRenter, updateRenter } from '../../api/renters';
import type { RenterCreate } from '../../types/renter';

export default function RenterFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<RenterCreate>({
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    id_issued_date: '',
    id_issued_place: '',
    date_of_birth: '',
    gender: '',
    hometown: '',
    occupation: '',
    workplace: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const { data: renter } = useQuery({
    queryKey: ['renter', id],
    queryFn: () => getRenter(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (renter) {
      setForm({
        full_name: renter.full_name || '',
        phone: renter.phone || '',
        email: renter.email || '',
        id_number: renter.id_number || '',
        id_issued_date: renter.id_issued_date || '',
        id_issued_place: renter.id_issued_place || '',
        date_of_birth: renter.date_of_birth || '',
        gender: renter.gender || '',
        hometown: renter.hometown || '',
        occupation: renter.occupation || '',
        workplace: renter.workplace || '',
        emergency_contact_name: renter.emergency_contact_name || '',
        emergency_contact_phone: renter.emergency_contact_phone || '',
      });
    }
  }, [renter]);

  const createMutation = useMutation({
    mutationFn: (data: RenterCreate) => createRenter(data),
    onSuccess: (newRenter) => navigate(`/renters/${newRenter.id}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: RenterCreate) => updateRenter(id!, data),
    onSuccess: () => navigate(`/renters/${id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const updateField = (field: keyof RenterCreate, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/renters')} className="text-gray-500 hover:text-gray-700">
          &larr; Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Sửa người thuê' : 'Thêm người thuê'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Thông tin cá nhân */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
              <select
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn...</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quê quán</label>
              <input
                type="text"
                value={form.hometown}
                onChange={(e) => updateField('hometown', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Thông tin CMND */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Thông tin CMND/CCCD</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số CMND/CCCD</label>
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày cấp</label>
              <input
                type="date"
                value={form.id_issued_date}
                onChange={(e) => updateField('id_issued_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nơi cấp</label>
              <input
                type="text"
                value={form.id_issued_place}
                onChange={(e) => updateField('id_issued_place', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Liên hệ */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Thông tin liên hệ</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Liên hệ khẩn cấp */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Liên hệ khẩn cấp</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên người liên hệ</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SĐT người liên hệ</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Thông tin công việc */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Thông tin công việc</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nghề nghiệp</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nơi làm việc</label>
              <input
                type="text"
                value={form.workplace}
                onChange={(e) => updateField('workplace', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Nút gửi */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/renters')}
            className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </form>
    </div>
  );
}
