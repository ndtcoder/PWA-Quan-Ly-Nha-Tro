import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import type { RevenueData, RevenueForecast } from '../../types/report';

interface Props {
  data: RevenueData[];
  forecast?: RevenueForecast[];
}

export default function RevenueChart({ data, forecast }: Props) {
  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);

  // Combine actual data with forecast for the chart
  const chartData = [
    ...data.map((d) => ({ ...d, forecasted_revenue: null })),
    ...(forecast || []).map((f) => ({
      month: f.month,
      revenue: null,
      collected: null,
      outstanding: null,
      forecasted_revenue: f.forecasted_revenue,
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatVND} />
        <Tooltip
          formatter={(value: number | string | Array<number | string>) => {
            if (value === null || value === undefined) return ['-', ''];
            const numValue = typeof value === 'number' ? value : Number(value);
            const formatted = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(numValue);
            return [formatted];
          }}
        />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#93C5FD" />
        <Bar dataKey="collected" name="Collected" fill="#1D4ED8" />
        {forecast && forecast.length > 0 && (
          <Line
            type="monotone"
            dataKey="forecasted_revenue"
            name="Forecast"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4 }}
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
