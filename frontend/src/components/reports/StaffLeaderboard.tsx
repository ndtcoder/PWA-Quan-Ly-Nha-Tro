import type { StaffPerformance } from '../../types/report';

interface Props {
  staff: StaffPerformance[];
  onSelect: (staff: StaffPerformance) => void;
  selectedId?: string;
}

export default function StaffLeaderboard({ staff, onSelect, selectedId }: Props) {
  const getMedal = (rank: number) => {
    if (rank === 1) return '\u{1F947}';
    if (rank === 2) return '\u{1F948}';
    if (rank === 3) return '\u{1F949}';
    return `${rank}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-time Rate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {staff.map((member, idx) => {
            const ontimeRate = member.tasks.total_assigned > 0
              ? ((1 - member.tasks.overdue_count / member.tasks.total_assigned) * 100).toFixed(0)
              : '100';

            return (
              <tr
                key={member.profile_id}
                onClick={() => onSelect(member)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === member.profile_id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm">{getMedal(idx + 1)}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{member.role}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {(member.tasks.completion_rate * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{ontimeRate}%</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {member.maintenance.avg_renter_rating
                    ? `${member.maintenance.avg_renter_rating}/5`
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(member.quality_score)}`}
                  >
                    {member.quality_score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
