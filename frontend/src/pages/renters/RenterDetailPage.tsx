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
    return <div className="text-center py-8 text-gray-500">Đang tải...</div>;
  }

  if (!renter) {
    return <div className="text-center py-8 text-gray-500">Không tìm thấy người thuê.</div>;
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
      {/* Tiêu đề */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/renters')} className="text-gray-500 hover:text-gray-700">
            &larr; Quay lại
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{renter.full_name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/renters/${id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Sửa
          </Link>
          <button
            onClick={() => inviteMutation.mutate()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Gửi lời mời
          </button>
        </div>
      </div>

      {/* Avatar + Thông tin cá nhân */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl text-gray-400">
            {renter.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <span className="text-sm text-gray-500">Số điện thoại</span>
              <p className="font-medium">{renter.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium">{renter.email || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Số CMND/CCCD</span>
              <p className="font-medium">{renter.id_number || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Ngày sinh</span>
              <p className="font-medium">{renter.date_of_birth || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Giới tính</span>
              <p className="font-medium">{renter.gender || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Quê quán</span>
              <p className="font-medium">{renter.hometown || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nghề nghiệp</span>
              <p className="font-medium">{renter.occupation || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nơi làm việc</span>
              <p className="font-medium">{renter.workplace || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Liên hệ khẩn cấp</span>
              <p className="font-medium">
                {renter.emergency_contact_name
                  ? `${renter.emergency_contact_name} (${renter.emergency_contact_phone || '-'})`
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Phòng hiện tại</span>
              <p className="font-medium">
                {renter.current_unit_number
                  ? `${renter.current_unit_number} - ${renter.current_property_name}`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ảnh CMND */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Giấy tờ tùy thân</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Mặt trước</p>
            {renter.id_photo_front_url ? (
              <img src={renter.id_photo_front_url} alt="CMND mặt trước" className="w-full h-48 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
            <input type="file" ref={frontInputRef} onChange={handleFrontUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => frontInputRef.current?.click()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Tải lên mặt trước
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Mặt sau</p>
            {renter.id_photo_back_url ? (
              <img src={renter.id_photo_back_url} alt="CMND mặt sau" className="w-full h-48 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
            <input type="file" ref={backInputRef} onChange={handleBackUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => backInputRef.current?.click()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Tải lên mặt sau
            </button>
          </div>
        </div>
      </div>

      {/* Tab */}
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
              Hợp đồng
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ghi chú
            </button>
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'contracts' && (
            <div>
              {renter.contracts_history.length === 0 ? (
                <p className="text-gray-500">Chưa có lịch sử hợp đồng.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số HĐ</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phòng</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tiền thuê</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
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
                          {contract.start_date} - {contract.end_date}
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
            <p className="text-gray-500">Tính năng ghi chú sẽ sớm ra mắt.</p>
          )}
        </div>
      </div>
    </div>
  );
}
