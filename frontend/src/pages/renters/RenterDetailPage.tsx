import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRenter, uploadIdFront, uploadIdBack, inviteRenter } from '../../api/renters';
import { useState, useRef } from 'react';
import ContractStatusBadge from '../../components/contract/ContractStatusBadge';

export default function RenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'contracts' | 'notes'>('contracts');
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const { data: renter, isLoading } = useQuery({
    queryKey: ['renter', id],
    queryFn: () => getRenter(id!),
    enabled: !!id,
  });

  const uploadFrontMutation = useMutation({
    mutationFn: (file: File) => uploadIdFront(id!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renter', id] }),
  });

  const uploadBackMutation = useMutation({
    mutationFn: (file: File) => uploadIdBack(id!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renter', id] }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteRenter(id!),
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!renter) {
    return <div className="text-center py-8 text-gray-500">Renter not found.</div>;
  }

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFrontMutation.mutate(file);
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadBackMutation.mutate(file);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/renters')} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{renter.full_name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/renters/${id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit
          </Link>
          <button
            onClick={() => inviteMutation.mutate()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Send Invite
          </button>
        </div>
      </div>

      {/* Avatar + Personal Info */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-6">
          {/* Avatar placeholder */}
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl text-gray-400">
            {renter.full_name.charAt(0).toUpperCase()}
          </div>
          {/* 2-column info */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <span className="text-sm text-gray-500">Phone</span>
              <p className="font-medium">{renter.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium">{renter.email || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">ID Number</span>
              <p className="font-medium">{renter.id_number || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Date of Birth</span>
              <p className="font-medium">{renter.date_of_birth || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Gender</span>
              <p className="font-medium">{renter.gender || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Hometown</span>
              <p className="font-medium">{renter.hometown || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Occupation</span>
              <p className="font-medium">{renter.occupation || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Workplace</span>
              <p className="font-medium">{renter.workplace || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Emergency Contact</span>
              <p className="font-medium">
                {renter.emergency_contact_name
                  ? `${renter.emergency_contact_name} (${renter.emergency_contact_phone || '-'})`
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Current Unit</span>
              <p className="font-medium">
                {renter.current_unit_number
                  ? `${renter.current_unit_number} - ${renter.current_property_name}`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ID Photos */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">ID Documents</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Front Side</p>
            {renter.id_photo_front_url ? (
              <img src={renter.id_photo_front_url} alt="ID Front" className="w-full h-48 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            <input type="file" ref={frontInputRef} onChange={handleFrontUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => frontInputRef.current?.click()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Upload Front
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Back Side</p>
            {renter.id_photo_back_url ? (
              <img src={renter.id_photo_back_url} alt="ID Back" className="w-full h-48 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            <input type="file" ref={backInputRef} onChange={handleBackUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => backInputRef.current?.click()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Upload Back
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'contracts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Contracts
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notes
            </button>
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'contracts' && (
            <div>
              {renter.contracts_history.length === 0 ? (
                <p className="text-gray-500">No contract history.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contract #</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rent</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {renter.contracts_history.map((contract) => (
                      <tr key={contract.id}>
                        <td className="px-4 py-2 text-sm">
                          <Link to={`/contracts/${contract.id}`} className="text-blue-600 hover:text-blue-800">
                            {contract.contract_number || '-'}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {contract.unit_number} - {contract.property_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {contract.start_date} to {contract.end_date}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {contract.monthly_rent.toLocaleString()} VND
                        </td>
                        <td className="px-4 py-2">
                          <ContractStatusBadge status={contract.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === 'notes' && (
            <p className="text-gray-500">Notes feature coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
