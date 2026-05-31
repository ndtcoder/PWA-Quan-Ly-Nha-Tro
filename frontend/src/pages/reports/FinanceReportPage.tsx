import { useState, useEffect } from 'react';
import { getRevenueReport, getOverdueReport } from '../../api/reports';
import RevenueChart from '../../components/reports/RevenueChart';
import type { RevenueReport, OverdueReport } from '../../types/report';

export default function FinanceReportPage() {
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(2024);
  const [propertyId, setPropertyId] = useState('');
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [overdueReport, setOverdueReport] = useState<OverdueReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, year, propertyId]);

  async function loadData() {
    setLoading(true);
    try {
      const [revenue, overdue] = await Promise.all([
        getRevenueReport({
          period,
          year,
          property_id: propertyId || undefined,
        }),
        getOverdueReport(),
      ]);
      setRevenueReport(revenue);
      setOverdueReport(overdue);
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Kỳ</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="monthly">Hàng tháng</option>
            <option value="quarterly">Hàng quý</option>
            <option value="yearly">Hàng năm</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Năm</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {[2024, 2023, 2022].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nhà</label>
          <input
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Tất cả nhà"
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : (
        <>
          {/* Revenue Chart */}
          {revenueReport && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan doanh thu</h3>
              <RevenueChart data={revenueReport.data} forecast={revenueReport.forecast} />
            </div>
          )}

          {/* Summary cards */}
          {revenueReport && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Tổng doanh thu</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatVND(revenueReport.summary.total_revenue)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Đã thu</p>
                <p className="text-xl font-bold text-green-600">
                  {formatVND(revenueReport.summary.total_collected)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Tỷ lệ thu</p>
                <p className="text-xl font-bold text-blue-600">
                  {revenueReport.summary.collection_rate}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Còn nợ</p>
                <p className="text-xl font-bold text-red-600">
                  {formatVND(
                    revenueReport.summary.total_revenue - revenueReport.summary.total_collected
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Overdue section */}
          {overdueReport && overdueReport.total_overdue_amount > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Hóa đơn quá hạn ({formatVND(overdueReport.total_overdue_amount)})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Renter
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoices
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {overdueReport.by_renter.map((r) => (
                      <tr key={r.renter_id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.renter_name}</td>
                        <td className="px-4 py-3 text-sm text-red-600 font-medium">
                          {formatVND(r.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.invoice_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
