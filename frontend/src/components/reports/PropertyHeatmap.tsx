import { useState } from 'react';
import type { UnitBreakdown } from '../../types/report';

interface Props {
  units: UnitBreakdown[];
}

export default function PropertyHeatmap({ units }: Props) {
  const [tooltip, setTooltip] = useState<{ unit: UnitBreakdown; x: number; y: number } | null>(null);

  const getColor = (incidents: number) => {
    if (incidents === 0) return 'bg-green-200 hover:bg-green-300';
    if (incidents <= 2) return 'bg-yellow-200 hover:bg-yellow-300';
    if (incidents <= 4) return 'bg-orange-300 hover:bg-orange-400';
    return 'bg-red-400 hover:bg-red-500';
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-200 rounded"></div>0 incidents
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>1-2 incidents
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-300 rounded"></div>3-4 incidents
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-400 rounded"></div>5+ incidents
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {units.map((unit) => (
          <div
            key={unit.unit_id}
            className={`relative p-3 rounded-lg text-center text-xs font-medium cursor-pointer transition-colors ${getColor(unit.incidents)}`}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ unit, x: rect.left, y: rect.top - 80 });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {unit.unit_number}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">Unit {tooltip.unit.unit_number}</p>
          <p>Incidents: {tooltip.unit.incidents}</p>
          <p>Revenue: {new Intl.NumberFormat('vi-VN').format(tooltip.unit.revenue)} VND</p>
        </div>
      )}
    </div>
  );
}
