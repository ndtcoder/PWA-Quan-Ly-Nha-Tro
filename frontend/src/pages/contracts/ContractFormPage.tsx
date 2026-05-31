import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getProperties, getUnits } from '../../api/properties';
import { getRenters, createRenter } from '../../api/renters';
import { createContract, activateContract, uploadContractScan } from '../../api/contracts';
import type { ContractCreate } from '../../types/contract';
import type { RenterCreate } from '../../types/renter';

export default function ContractFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedRenterId, setSelectedRenterId] = useState('');
  const [createNewRenter, setCreateNewRenter] = useState(false);
  const [renterSearch, setRenterSearch] = useState('');
  const [newRenter, setNewRenter] = useState<RenterCreate>({ full_name: '' });
  const [contractDetails, setContractDetails] = useState({
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    deposit_amount: 0,
    payment_due_day: 5,
    max_occupants: 2,
    terms: '',
  });
  const [scanFile, setScanFile] = useState<File | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedPropertyId],
    queryFn: () => getUnits(selectedPropertyId, { status: 'vacant' }),
    enabled: !!selectedPropertyId,
  });

  const { data: renters = [] } = useQuery({
    queryKey: ['renters', renterSearch],
    queryFn: () => getRenters({ search: renterSearch || undefined }),
  });

  const createRenterMutation = useMutation({
    mutationFn: (data: RenterCreate) => createRenter(data),
    onSuccess: (renter) => {
      setSelectedRenterId(renter.id);
      setCreateNewRenter(false);
    },
  });

  const createContractMutation = useMutation({
    mutationFn: (data: ContractCreate) => createContract(data),
    onSuccess: async (contract) => {
      if (scanFile) {
        await uploadContractScan(contract.id, scanFile);
      }
      navigate(`/contracts/${contract.id}`);
    },
  });

  const handleSaveDraft = () => {
    const data: ContractCreate = {
      unit_id: selectedUnitId,
      renter_id: selectedRenterId,
      ...contractDetails,
    };
    createContractMutation.mutate(data);
  };

  const handleActivate = async () => {
    const data: ContractCreate = {
      unit_id: selectedUnitId,
      renter_id: selectedRenterId,
      ...contractDetails,
    };
    const contract = await createContract(data);
    if (scanFile) {
      await uploadContractScan(contract.id, scanFile);
    }
    await activateContract(contract.id);
    navigate(`/contracts/${contract.id}`);
  };

  const handleCreateRenter = () => {
    createRenterMutation.mutate(newRenter);
  };

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const selectedRenter = renters.find((r) => r.id === selectedRenterId);
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Hợp đồng mới</h1>

      {/* Chỉ số tiến trình */}
      <div className="flex items-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Bước 1: Chọn nhà và phòng */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Bước 1: Chọn phòng</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cho thuê</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setSelectedUnitId('');
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn nhà...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phòng trống</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                disabled={!selectedPropertyId}
              >
                <option value="">Chọn phòng...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number} (Tầng {u.floor || '-'}, {u.area_sqm || '-'} m²)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedUnitId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Bước 2: Chọn hoặc tạo người thuê */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Bước 2: Chọn người thuê</h2>
          {!createNewRenter ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT hoặc CMND..."
                value={renterSearch}
                onChange={(e) => setRenterSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {renters.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRenterId(r.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                      selectedRenterId === r.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-sm text-gray-500">{r.phone || 'Chưa có SĐT'} | {r.id_number || 'Chưa có CMND'}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCreateNewRenter(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Tạo người thuê mới
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                  <input
                    type="text"
                    value={newRenter.full_name}
                    onChange={(e) => setNewRenter({ ...newRenter, full_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={newRenter.phone || ''}
                    onChange={(e) => setNewRenter({ ...newRenter, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newRenter.email || ''}
                    onChange={(e) => setNewRenter({ ...newRenter, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số CMND/CCCD</label>
                  <input
                    type="text"
                    value={newRenter.id_number || ''}
                    onChange={(e) => setNewRenter({ ...newRenter, id_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateRenter}
                  disabled={!newRenter.full_name}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Tạo người thuê
                </button>
                <button
                  onClick={() => setCreateNewRenter(false)}
                  className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedRenterId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Bước 3: Chi tiết hợp đồng */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Bước 3: Chi tiết hợp đồng</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                value={contractDetails.start_date}
                onChange={(e) => setContractDetails({ ...contractDetails, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
              <input
                type="date"
                value={contractDetails.end_date}
                onChange={(e) => setContractDetails({ ...contractDetails, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiền thuê hàng tháng (VND)</label>
              <input
                type="number"
                value={contractDetails.monthly_rent}
                onChange={(e) => setContractDetails({ ...contractDetails, monthly_rent: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiền cọc (VND)</label>
              <input
                type="number"
                value={contractDetails.deposit_amount}
                onChange={(e) => setContractDetails({ ...contractDetails, deposit_amount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thanh toán</label>
              <input
                type="number"
                min={1}
                max={28}
                value={contractDetails.payment_due_day}
                onChange={(e) => setContractDetails({ ...contractDetails, payment_due_day: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số người tối đa</label>
              <input
                type="number"
                min={1}
                value={contractDetails.max_occupants}
                onChange={(e) => setContractDetails({ ...contractDetails, max_occupants: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Điều khoản & Điều kiện</label>
              <textarea
                value={contractDetails.terms}
                onChange={(e) => setContractDetails({ ...contractDetails, terms: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                placeholder="Các điều khoản bổ sung..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Quay lại
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!contractDetails.start_date || !contractDetails.end_date || !contractDetails.monthly_rent}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Bước 4: Xem trước & Hành động */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Bước 4: Xem trước</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Thông tin phòng</h3>
              <p className="text-sm">Nhà: {selectedProperty?.name}</p>
              <p className="text-sm">Phòng: {selectedUnit?.unit_number}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Thông tin người thuê</h3>
              <p className="text-sm">Tên: {selectedRenter?.full_name}</p>
              <p className="text-sm">SĐT: {selectedRenter?.phone || '-'}</p>
            </div>
            <div className="col-span-2">
              <h3 className="font-medium text-gray-700 mb-2">Chi tiết hợp đồng</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <p>Bắt đầu: {contractDetails.start_date}</p>
                <p>Kết thúc: {contractDetails.end_date}</p>
                <p>Tiền thuê: {contractDetails.monthly_rent.toLocaleString()} VND</p>
                <p>Tiền cọc: {contractDetails.deposit_amount.toLocaleString()} VND</p>
                <p>Ngày TT: {contractDetails.payment_due_day}</p>
                <p>Số người tối đa: {contractDetails.max_occupants}</p>
              </div>
            </div>
          </div>

          {/* Upload scan PDF */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tải lên bản scan hợp đồng (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setScanFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {scanFile && (
              <p className="mt-1 text-sm text-green-600">Đã chọn: {scanFile.name}</p>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(3)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Quay lại
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Lưu nháp
              </button>
              <button
                onClick={handleActivate}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Kích hoạt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
