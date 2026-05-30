import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getProperties, getUnits } from '../../api/properties';
import { getRenters, createRenter } from '../../api/renters';
import { createContract, activateContract } from '../../api/contracts';
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
    onSuccess: (contract) => {
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Contract</h1>

      {/* Progress Indicator */}
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

      {/* Step 1: Select Property and Unit */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 1: Select Unit</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setSelectedUnitId('');
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vacant Unit</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                disabled={!selectedPropertyId}
              >
                <option value="">Select unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number} (Floor {u.floor || '-'}, {u.area_sqm || '-'} sqm)
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
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select or Create Renter */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 2: Select Renter</h2>
          {!createNewRenter ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search by name, phone, or ID..."
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
                    <p className="text-sm text-gray-500">{r.phone || 'No phone'} | {r.id_number || 'No ID'}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCreateNewRenter(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Create New Renter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newRenter.full_name}
                    onChange={(e) => setNewRenter({ ...newRenter, full_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
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
                  Create Renter
                </button>
                <button
                  onClick={() => setCreateNewRenter(false)}
                  className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Previous
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedRenterId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contract Details */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 3: Contract Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={contractDetails.start_date}
                onChange={(e) => setContractDetails({ ...contractDetails, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={contractDetails.end_date}
                onChange={(e) => setContractDetails({ ...contractDetails, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (VND)</label>
              <input
                type="number"
                value={contractDetails.monthly_rent}
                onChange={(e) => setContractDetails({ ...contractDetails, monthly_rent: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount (VND)</label>
              <input
                type="number"
                value={contractDetails.deposit_amount}
                onChange={(e) => setContractDetails({ ...contractDetails, deposit_amount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Day</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Occupants</label>
              <input
                type="number"
                min={1}
                value={contractDetails.max_occupants}
                onChange={(e) => setContractDetails({ ...contractDetails, max_occupants: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea
                value={contractDetails.terms}
                onChange={(e) => setContractDetails({ ...contractDetails, terms: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                placeholder="Additional terms and conditions..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Previous
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!contractDetails.start_date || !contractDetails.end_date || !contractDetails.monthly_rent}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Actions */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 4: Preview</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Unit Information</h3>
              <p className="text-sm">Property: {selectedProperty?.name}</p>
              <p className="text-sm">Unit: {selectedUnit?.unit_number}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Renter Information</h3>
              <p className="text-sm">Name: {selectedRenter?.full_name}</p>
              <p className="text-sm">Phone: {selectedRenter?.phone || '-'}</p>
            </div>
            <div className="col-span-2">
              <h3 className="font-medium text-gray-700 mb-2">Contract Details</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <p>Start: {contractDetails.start_date}</p>
                <p>End: {contractDetails.end_date}</p>
                <p>Rent: {contractDetails.monthly_rent.toLocaleString()} VND</p>
                <p>Deposit: {contractDetails.deposit_amount.toLocaleString()} VND</p>
                <p>Due Day: {contractDetails.payment_due_day}</p>
                <p>Max Occupants: {contractDetails.max_occupants}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(3)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
              Previous
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Save Draft
              </button>
              <button
                onClick={handleActivate}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
