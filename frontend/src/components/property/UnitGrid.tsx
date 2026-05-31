import { useNavigate } from 'react-router-dom';
import type { Unit } from '../../types/property';

const statusColors: Record<string, string> = {
  vacant: 'bg-green-100 border-green-400 text-green-800',
  occupied: 'bg-red-100 border-red-400 text-red-800',
  maintenance: 'bg-yellow-100 border-yellow-400 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  vacant: 'Trống',
  occupied: 'Đang thuê',
  maintenance: 'Bảo trì',
};

interface UnitGridProps {
  units: Unit[];
}

export default function UnitGrid({ units }: UnitGridProps) {
  const navigate = useNavigate();

  if (units.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">Không tìm thấy phòng nào.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
      {units.map((unit) => (
        <div
          key={unit.id}
          onClick={() => navigate(`/units/${unit.id}`)}
          className={`cursor-pointer rounded-lg border-2 p-2 text-center transition hover:scale-105 ${
            statusColors[unit.status] || 'bg-gray-100 border-gray-300 text-gray-800'
          }`}
        >
          <div className="text-sm font-semibold">{unit.unit_number}</div>
          <div className="text-xs mt-0.5">
            {statusLabels[unit.status] || unit.status}
          </div>
        </div>
      ))}
    </div>
  );
}
