import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMeterReadings, approveMeterReading } from '../../api/meters';
import type { MeterReading, MeterReadingFilter } from '../../types/meter';

function MeterReadingListPage() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingMonth, setBillingMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [meterTypeFilter, setMeterTypeFilter] = useState<string>('');
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    reading: MeterReading | null;
    value: string;
  }>({ open: false, reading: null, value: '' });

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const params: MeterReadingFilter = { billing_month: billingMonth };
      if (meterTypeFilter) params.meter_type = meterTypeFilter;
      if (approvalFilter === 'approved') params.is_approved = true;
      if (approvalFilter === 'pending') params.is_approved = false;
      const data = await getMeterReadings(params);
      setReadings(data);
    } catch (err) {
      console.error('Failed to fetch meter readings', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchReadings();
  });

  const handleApprove = async () => {
    if (!approveModal.reading) return;
    try {
      const approved_value = approveModal.value
        ? parseFloat(approveModal.value)
        : undefined;
      await approveMeterReading(approveModal.reading.id, { approved_value });
      setApproveModal({ open: false, reading: null, value: '' });
      fetchReadings();
    } catch (err) {
      console.error('Failed to approve reading', err);
    }
  };

  const getStatusBadge = (reading: MeterReading) => {
    if (reading.is_approved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Đã duyệt
        </span>
      );
    }
    if (reading.ai_confidence !== undefined && reading.ai_confidence < 0.6) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Độ tin cậy thấp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Chờ duyệt
      </span>
    );
  };

  const getMeterIcon = (type: string) => {
    if (type === 'electricity') {
      return <span className="text-yellow-500" title="Điện">&#9889;</span>;
    }
    return <span className="text-blue-500" title="Nước">&#128167;</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Đọc đồng hồ</h1>
        <Link
          to="/meters/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Tải ảnh đồng hồ
        </Link>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tháng
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loại đồng hồ
          </label>
          <select
            value={meterTypeFilter}
            onChange={(e) => setMeterTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="electricity">Điện</option>
            <option value="water">Nước</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trạng thái
          </label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
          </select>
        </div>
        <button
          onClick={fetchReadings}
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
        >
          Lọc
        </button>
      </div>

      {/* Bảng */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : readings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có dữ liệu đọc đồng hồ cho kỳ này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nhà
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Phòng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chỉ số cũ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chỉ số mới (AI)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tiêu thụ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {readings.map((reading) => (
                  <tr key={reading.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reading.property_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reading.unit_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getMeterIcon(reading.meter_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reading.previous_reading ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {reading.ai_detected_value ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reading.consumption ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(reading)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!reading.is_approved && (
                        <button
                          onClick={() =>
                            setApproveModal({
                              open: true,
                              reading,
                              value: reading.ai_detected_value?.toString() || '',
                            })
                          }
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Duyệt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal duyệt */}
      {approveModal.open && approveModal.reading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Duyệt chỉ số đồng hồ</h3>
            <p className="text-sm text-gray-600 mb-2">
              Phòng: {approveModal.reading.unit_number} |{' '}
              {approveModal.reading.meter_type === 'electricity'
                ? 'Điện'
                : 'Nước'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              AI nhận diện:{' '}
              <span className="font-bold">
                {approveModal.reading.ai_detected_value ?? 'N/A'}
              </span>
              {approveModal.reading.ai_confidence !== undefined && (
                <span className="ml-2 text-xs text-gray-400">
                  (độ tin cậy: {(approveModal.reading.ai_confidence * 100).toFixed(0)}%)
                </span>
              )}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá trị chỉnh sửa (để trống nếu dùng giá trị AI)
              </label>
              <input
                type="number"
                value={approveModal.value}
                onChange={(e) =>
                  setApproveModal({ ...approveModal, value: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Nhập giá trị chỉnh sửa..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
              >
                Xác nhận duyệt
              </button>
              <button
                onClick={() =>
                  setApproveModal({ open: false, reading: null, value: '' })
                }
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeterReadingListPage;
