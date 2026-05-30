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
          Approved
        </span>
      );
    }
    if (reading.ai_confidence !== undefined && reading.ai_confidence < 0.6) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Low Confidence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const getMeterIcon = (type: string) => {
    if (type === 'electricity') {
      return <span className="text-yellow-500" title="Electricity">&#9889;</span>;
    }
    return <span className="text-blue-500" title="Water">&#128167;</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
        <Link
          to="/meters/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Upload Reading
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Billing Month
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
            Meter Type
          </label>
          <select
            value={meterTypeFilter}
            onChange={(e) => setMeterTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <button
          onClick={fetchReadings}
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
        >
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : readings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No meter readings found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Property
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Previous
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current (AI)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Consumption
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
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
                          Approve
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

      {/* Approve Modal */}
      {approveModal.open && approveModal.reading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Approve Meter Reading</h3>
            <p className="text-sm text-gray-600 mb-2">
              Unit: {approveModal.reading.unit_number} |{' '}
              {approveModal.reading.meter_type === 'electricity'
                ? 'Electricity'
                : 'Water'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              AI Detected:{' '}
              <span className="font-bold">
                {approveModal.reading.ai_detected_value ?? 'N/A'}
              </span>
              {approveModal.reading.ai_confidence !== undefined && (
                <span className="ml-2 text-xs text-gray-400">
                  (confidence: {(approveModal.reading.ai_confidence * 100).toFixed(0)}%)
                </span>
              )}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Override Value (leave empty to use AI value)
              </label>
              <input
                type="number"
                value={approveModal.value}
                onChange={(e) =>
                  setApproveModal({ ...approveModal, value: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter corrected value..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
              >
                Confirm Approval
              </button>
              <button
                onClick={() =>
                  setApproveModal({ open: false, reading: null, value: '' })
                }
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeterReadingListPage;
