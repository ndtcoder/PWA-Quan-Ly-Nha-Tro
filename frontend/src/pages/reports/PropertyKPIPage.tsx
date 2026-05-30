import { useState, useEffect } from 'react';
import { getPropertyKpis, getUnitsBreakdown, compareProperties } from '../../api/reports';
import PropertyKPICards from '../../components/reports/PropertyKPICards';
import PropertyHeatmap from '../../components/reports/PropertyHeatmap';
import PropertyCompareRadar from '../../components/reports/PropertyCompareRadar';
import type { PropertyKPI, UnitBreakdown } from '../../types/report';

export default function PropertyKPIPage() {
  const [propertyId, setPropertyId] = useState('');
  const [year, setYear] = useState(2024);
  const [period, setPeriod] = useState('monthly');
  const [kpis, setKpis] = useState<PropertyKPI | null>(null);
  const [units, setUnits] = useState<UnitBreakdown[]>([]);
  const [compareData, setCompareData] = useState<PropertyKPI[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareIds, setCompareIds] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propertyId) {
      loadData();
    }
  }, [propertyId, year, period]);

  async function loadData() {
    setLoading(true);
    try {
      const [kpiData, unitsData] = await Promise.all([
        getPropertyKpis({ property_id: propertyId, period, year }),
        getUnitsBreakdown(propertyId, { period, year }),
      ]);
      setKpis(kpiData);
      setUnits(unitsData);
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    if (!compareIds) return;
    try {
      const data = await compareProperties({
        property_ids: compareIds,
        period,
        year,
      });
      setCompareData(data);
      setShowCompare(true);
    } catch (err) {
      // Handle error silently
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'alert':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Property selector */}
      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Property ID</label>
          <input
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Enter property ID"
            className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
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
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : kpis ? (
        <>
          {/* KPI Cards */}
          <PropertyKPICards kpis={kpis} />

          {/* Alerts */}
          {kpis.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
              {kpis.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-lg text-sm ${severityColor(alert.severity)}`}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          )}

          {/* Heatmap */}
          {units.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Heatmap</h3>
              <PropertyHeatmap units={units} />
            </div>
          )}

          {/* Compare section */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Properties</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Property IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={compareIds}
                  onChange={(e) => setCompareIds(e.target.value)}
                  placeholder="id1, id2, id3"
                  className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleCompare}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Compare
              </button>
            </div>
            {showCompare && compareData.length > 0 && (
              <div className="mt-6">
                <PropertyCompareRadar properties={compareData} />
              </div>
            )}
          </div>

          {/* Units Breakdown */}
          {units.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Units Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incidents</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Electricity (kWh)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Water (m3)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {units.map((unit) => (
                      <tr key={unit.unit_id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{unit.unit_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{unit.status}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{unit.incidents}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{unit.electricity_consumption}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{unit.water_consumption}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Intl.NumberFormat('vi-VN').format(unit.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Enter a property ID to view KPIs
        </div>
      )}
    </div>
  );
}
