import { useState, useEffect } from 'react';
import { getStaffLeaderboard, getStaffTrend } from '../../api/reports';
import StaffLeaderboard from '../../components/reports/StaffLeaderboard';
import StaffRadarChart from '../../components/reports/StaffRadarChart';
import type { Leaderboard, StaffPerformance, StaffTrend as StaffTrendType } from '../../types/report';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function StaffReportPage() {
  const [period, setPeriod] = useState('monthly');
  const [propertyId, setPropertyId] = useState('');
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffPerformance | null>(null);
  const [trend, setTrend] = useState<StaffTrendType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, propertyId]);

  useEffect(() => {
    if (selectedStaff) {
      loadTrend(selectedStaff.profile_id);
    }
  }, [selectedStaff]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getStaffLeaderboard({
        period,
        property_id: propertyId || undefined,
      });
      setLeaderboard(data);
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  async function loadTrend(staffId: string) {
    try {
      const data = await getStaffTrend(staffId, 6);
      setTrend(data);
    } catch (err) {
      // Handle error silently
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Property</label>
          <input
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="All properties"
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Leaderboard */}
          {leaderboard && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Staff Leaderboard ({leaderboard.total_staff} staff)
              </h3>
              <StaffLeaderboard
                staff={leaderboard.top}
                onSelect={setSelectedStaff}
                selectedId={selectedStaff?.profile_id}
              />
            </div>
          )}

          {/* Selected staff detail */}
          {selectedStaff && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedStaff.full_name} - Performance
                </h3>
                <StaffRadarChart staff={selectedStaff} />
              </div>

              {/* Trend line chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quality Score Trend (6 months)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="quality_score"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
