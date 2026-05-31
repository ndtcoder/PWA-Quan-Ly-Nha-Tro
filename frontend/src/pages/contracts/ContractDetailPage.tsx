import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContract, activateContract, terminateContract, exportContractPdf } from '../../api/contracts';
import ContractStatusBadge from '../../components/contract/ContractStatusBadge';
import { useState } from 'react';

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => getContract(id!),
    enabled: !!id,
  });

  const activateMutation = useMutation({
    mutationFn: () => activateContract(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract', id] }),
  });

  const terminateMutation = useMutation({
    mutationFn: (reason: string) => terminateContract(id!, reason),
    onSuccess: () => {
      setShowTerminateModal(false);
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => exportContractPdf(id!),
    onSuccess: (data) => {
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Đang tải...</div>;
  }

  if (!contract) {
    return <div className="text-center py-8 text-gray-500">Không tìm thấy hợp đồng.</div>;
  }

  return (
    <div>
      {/* Tiêu đề */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/contracts')} className="text-gray-500 hover:text-gray-700">
            &larr; Quay lại
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h1>
          <ContractStatusBadge status={contract.status} />
        </div>
        <div className="flex gap-2">
          {contract.status === 'draft' && (
            <button
              onClick={() => activateMutation.mutate()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Kích hoạt
            </button>
          )}
          {contract.status === 'active' && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Chấm dứt
            </button>
          )}
          <button
            onClick={() => exportPdfMutation.mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Xuất PDF
          </button>
          {contract.pdf_url && (
            <a
              href={contract.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Tải PDF
            </a>
          )}
          {contract.scan_pdf_url && (
            <a
              href={contract.scan_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              Xem hợp đồng Scan
            </a>
          )}
        </div>
      </div>

      {/* Tiến trình */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mx-auto mb-1"></div>
            <p className="text-xs text-gray-500">Tạo lúc</p>
            <p className="text-xs">{contract.created_at?.split('T')[0]}</p>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div
              className={`h-full ${contract.signed_at ? 'bg-green-500' : 'bg-gray-200'}`}
              style={{ width: contract.signed_at ? '100%' : '0%' }}
            />
          </div>
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${contract.signed_at ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <p className="text-xs text-gray-500">Ký lúc</p>
            <p className="text-xs">{contract.signed_at?.split('T')[0] || '-'}</p>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2"></div>
          <div className="text-center">
            <div className="w-4 h-4 rounded-full bg-gray-300 mx-auto mb-1"></div>
            <p className="text-xs text-gray-500">Hết hạn</p>
            <p className="text-xs">{contract.end_date}</p>
          </div>
        </div>
      </div>

      {/* Bố cục 2 cột */}
      <div className="grid grid-cols-2 gap-6">
        {/* Thông tin hợp đồng */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Thông tin hợp đồng</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Phòng:</span>
              <span className="font-medium">{contract.unit_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nhà:</span>
              <span className="font-medium">{contract.property_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày bắt đầu:</span>
              <span className="font-medium">{contract.start_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày kết thúc:</span>
              <span className="font-medium">{contract.end_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tiền thuê hàng tháng:</span>
              <span className="font-medium">{contract.monthly_rent.toLocaleString()} VND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tiền cọc:</span>
              <span className="font-medium">{contract.deposit_amount.toLocaleString()} VND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày thanh toán:</span>
              <span className="font-medium">{contract.payment_due_day}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số người tối đa:</span>
              <span className="font-medium">{contract.max_occupants}</span>
            </div>
            {contract.terms && (
              <div>
                <span className="text-gray-500">Điều khoản:</span>
                <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{contract.terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Thông tin người thuê */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Thông tin người thuê</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Tên:</span>
              <span className="font-medium">{contract.renter_name}</span>
            </div>
            {contract.terminated_at && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chấm dứt lúc:</span>
                  <span className="font-medium text-red-600">{contract.terminated_at.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-gray-500">Lý do:</span>
                  <p className="mt-1 text-sm bg-red-50 p-2 rounded text-red-700">{contract.termination_reason}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal chấm dứt */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Chấm dứt hợp đồng</h3>
            <textarea
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Lý do chấm dứt..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => terminateMutation.mutate(terminationReason)}
                disabled={!terminationReason}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Chấm dứt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
