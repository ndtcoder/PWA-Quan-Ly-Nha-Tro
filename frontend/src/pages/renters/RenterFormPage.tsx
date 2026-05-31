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
    id_photo_links: [],
    notes: '',
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
        id_photo_links: renter.id_photo_links || [],
        notes: renter.notes || '',
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

  const addPhotoLink = () => {
    const links = form.id_photo_links || [];
    if (links.length < 5) {
      setForm({ ...form, id_photo_links: [...links, ''] });
    }
  };

  const removePhotoLink = (index: number) => {
    const links = [...(form.id_photo_links || [])];
    links.splice(index, 1);
    setForm({ ...form, id_photo_links: links });
  };

  const updatePhotoLink = (index: number, value: string) => {
    const links = [...(form.id_photo_links || [])];
    links[index] = value;
    setForm({ ...form, id_photo_links: links });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/renters')} className="text-gray-500 hover:text-gray-700">
          &larr; Quay l&#7841;i
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'S\u1EEDa ng\u01B0\u1EDDi thu\u00EA' : 'Th\u00EAm ng\u01B0\u1EDDi thu\u00EA'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Thong tin ca nhan */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Th\u00F4ng tin c\u00E1 nh\u00E2n</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">H\u1ECD t\u00EAn *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gi\u1EDBi t\u00EDnh</label>
              <select
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Ch\u1ECDn...</option>
                <option value="male">Nam</option>
                <option value="female">N\u1EEF</option>
                <option value="other">Kh\u00E1c</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ng\u00E0y sinh</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qu\u00EA qu\u00E1n</label>
              <input
                type="text"
                value={form.hometown}
                onChange={(e) => updateField('hometown', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Thong tin CMND */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Th\u00F4ng tin CMND/CCCD</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">S\u1ED1 CMND/CCCD</label>
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ng\u00E0y c\u1EA5p</label>
              <input
                type="date"
                value={form.id_issued_date}
                onChange={(e) => updateField('id_issued_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">N\u01A1i c\u1EA5p</label>
              <input
                type="text"
                value={form.id_issued_place}
                onChange={(e) => updateField('id_issued_place', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Anh CCCD */}
        <div>
          <h2 className="text-lg font-semibold mb-4">\u1EA2nh CCCD</h2>
          <p className="text-sm text-gray-500 mb-3">Link \u1EA3nh CCCD (t\u1ED1i \u0111a 5)</p>
          <div className="space-y-2">
            {(form.id_photo_links || []).map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => updatePhotoLink(index, e.target.value)}
                  placeholder="D\u00E1n link \u1EA3nh CCCD..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removePhotoLink(index)}
                  className="text-red-500 hover:text-red-700 px-2 font-bold"
                >
                  X
                </button>
              </div>
            ))}
          </div>
          {(form.id_photo_links || []).length < 5 ? (
            <button
              type="button"
              onClick={addPhotoLink}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + Th\u00EAm link
            </button>
          ) : (
            <p className="mt-2 text-sm text-gray-400">\u0110\u00E3 \u0111\u1EA1t t\u1ED1i \u0111a 5 link</p>
          )}
        </div>

        {/* Lien he */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Th\u00F4ng tin li\u00EAn h\u1EC7</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">S\u1ED1 \u0111i\u1EC7n tho\u1EA1i</label>
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

        {/* Lien he khan cap */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Li\u00EAn h\u1EC7 kh\u1EA9n c\u1EA5p</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T\u00EAn ng\u01B0\u1EDDi li\u00EAn h\u1EC7</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">S\u0110T ng\u01B0\u1EDDi li\u00EAn h\u1EC7</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Thong tin cong viec */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Th\u00F4ng tin c\u00F4ng vi\u1EC7c</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngh\u1EC1 nghi\u1EC7p</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N\u01A1i l\u00E0m vi\u1EC7c</label>
              <input
                type="text"
                value={form.workplace}
                onChange={(e) => updateField('workplace', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Ghi chu */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Ghi ch\u00FA</h2>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
            placeholder="Ghi ch\u00FA v\u1EC1 ng\u01B0\u1EDDi thu\u00EA..."
          />
        </div>

        {/* Nut gui */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/renters')}
            className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            H\u1EE7y
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'C\u1EADp nh\u1EADt' : 'T\u1EA1o m\u1EDBi'}
          </button>
        </div>
      </form>
    </div>
  );
}
