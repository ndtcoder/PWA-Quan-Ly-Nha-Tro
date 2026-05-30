import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MeterHistory } from '../../types/meter';

interface MeterHistoryChartProps {
  data: MeterHistory[];
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload: MeterHistory;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0]?.payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {item?.electricity_consumption != null && (
        <p className="text-yellow-600">
          Electricity: {item.electricity_consumption} kWh
          {item.electricity_cost != null && (
            <span className="text-gray-500 ml-1">
              (~{item.electricity_cost.toLocaleString()} VND)
            </span>
          )}
        </p>
      )}
      {item?.water_consumption != null && (
        <p className="text-blue-600">
          Water: {item.water_consumption} m3
          {item.water_cost != null && (
            <span className="text-gray-500 ml-1">
              (~{item.water_cost.toLocaleString()} VND)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function MeterHistoryChart({ data }: MeterHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No meter history data available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Consumption History (12 months)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="billing_month"
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="electricity_consumption"
            name="Electricity (kWh)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="water_consumption"
            name="Water (m3)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MeterHistoryChart;
