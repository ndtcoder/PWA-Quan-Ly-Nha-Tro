import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import type { StaffPerformance } from '../../types/report';

interface Props {
  staff: StaffPerformance;
}

export default function StaffRadarChart({ staff }: Props) {
  // Calculate the 4 dimension scores
  const completionScore = staff.tasks.completion_rate * 100;

  const timelinessScore =
    staff.tasks.total_assigned > 0
      ? (1 - staff.tasks.overdue_count / staff.tasks.total_assigned) * 100
      : 100;

  const qualityScore = staff.maintenance.avg_renter_rating
    ? (staff.maintenance.avg_renter_rating / 5) * 100
    : 50;

  // Speed score (inversely proportional to resolution hours)
  let speedScore = 75;
  const avgHours = staff.maintenance.avg_resolution_hours;
  if (avgHours > 0) {
    if (avgHours <= 4) speedScore = 100;
    else if (avgHours <= 8) speedScore = 90;
    else if (avgHours <= 24) speedScore = 75;
    else if (avgHours <= 48) speedScore = 60;
    else if (avgHours <= 72) speedScore = 40;
    else speedScore = 20;
  }

  const data = [
    { subject: 'Completion', value: Math.round(completionScore) },
    { subject: 'Timeliness', value: Math.round(timelinessScore) },
    { subject: 'Quality', value: Math.round(qualityScore) },
    { subject: 'Speed', value: Math.round(speedScore) },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name={staff.full_name}
          dataKey="value"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
