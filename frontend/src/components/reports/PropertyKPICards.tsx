import type { PropertyKPI } from '../../types/report';

interface Props {
  kpis: PropertyKPI;
}

export default function PropertyKPICards({ kpis }: Props) {
  const cards = [
    {
      label: 'Occupancy Rate',
      value: `${kpis.occupancy.occupancy_rate}%`,
      comparison: null,
    },
    {
      label: 'Cost / Person',
      value: new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(
        (kpis.utility_efficiency.electricity.cost_per_person || 0) +
        (kpis.utility_efficiency.water.cost_per_person || 0)
      ),
      comparison: kpis.utility_efficiency.electricity.mom_change_pct,
    },
    {
      label: 'Incidents / Unit',
      value: kpis.maintenance.incident_rate.toFixed(1),
      comparison: null,
    },
    {
      label: 'Operating Cost Ratio',
      value: `${kpis.financial_efficiency.operating_cost_ratio}%`,
      comparison: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">{card.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            {card.comparison !== null && card.comparison !== 0 && (
              <span
                className={`text-sm font-medium ${
                  card.comparison > 0 ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {card.comparison > 0 ? '\u2191' : '\u2193'}
                {Math.abs(card.comparison)}%
              </span>
            )}
          </div>
          {card.comparison !== null && (
            <p className="text-xs text-gray-400 mt-1">vs previous period</p>
          )}
        </div>
      ))}
    </div>
  );
}
