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
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Renter' : 'New Renter'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Personal Info */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hometown</label>
              <input
                type="text"
                value={form.hometown}
                onChange={(e) => updateField('hometown', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* ID Info */}
        <div>
          <h2 className="text-lg font-semibold mb-4">ID Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number (CMND/CCCD)</label>
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Issued Date</label>
              <input
                type="date"
                value={form.id_issued_date}
                onChange={(e) => updateField('id_issued_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Issued Place</label>
              <input
                type="text"
                value={form.id_issued_place}
                onChange={(e) => updateField('id_issued_place', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
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

        {/* Emergency Contact */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Work Info */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Work Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workplace</label>
              <input
                type="text"
                value={form.workplace}
                onChange={(e) => updateField('workplace', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/renters')}
            className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
