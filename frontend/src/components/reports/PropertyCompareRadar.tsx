import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';
import type { PropertyKPI } from '../../types/report';

interface Props {
  properties: PropertyKPI[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function PropertyCompareRadar({ properties }: Props) {
  // Build radar data with 5 axes
  const axes = ['Occupancy', 'Electricity Cost', 'Water Cost', 'Incident Rate', 'Collection Rate'];

  // Normalize values (0-100 scale)
  const data = axes.map((axis) => {
    const entry: Record<string, string | number> = { subject: axis };

    properties.forEach((prop, idx) => {
      let value = 0;
      switch (axis) {
        case 'Occupancy':
          value = prop.occupancy.occupancy_rate;
          break;
        case 'Electricity Cost':
          // Invert: lower cost = higher score
          value = Math.max(0, 100 - (prop.utility_efficiency.electricity.cost_per_unit / 100));
          break;
        case 'Water Cost':
          value = Math.max(0, 100 - (prop.utility_efficiency.water.cost_per_unit / 100));
          break;
        case 'Incident Rate':
          // Invert: lower rate = higher score
          value = Math.max(0, 100 - prop.maintenance.incident_rate * 20);
          break;
        case 'Collection Rate':
          // Use revenue vs operating cost as proxy
          value = Math.max(0, 100 - prop.financial_efficiency.operating_cost_ratio);
          break;
      }
      entry[`property_${idx}`] = Math.round(Math.min(100, Math.max(0, value)));
    });

    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        {properties.map((prop, idx) => (
          <Radar
            key={prop.property_id}
            name={prop.property_name || `Property ${idx + 1}`}
            dataKey={`property_${idx}`}
            stroke={COLORS[idx % COLORS.length]}
            fill={COLORS[idx % COLORS.length]}
            fillOpacity={0.15}
          />
        ))}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
