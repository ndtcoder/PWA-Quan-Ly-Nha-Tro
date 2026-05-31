import { useNavigate } from 'react-router-dom';
import type { Property } from '../../types/property';

const typeLabels: Record<string, string> = {
  house: 'House',
  apartment_building: 'Apartment',
  villa: 'Villa',
};

const typeBadgeColors: Record<string, string> = {
  house: 'bg-blue-100 text-blue-800',
  apartment_building: 'bg-purple-100 text-purple-800',
  villa: 'bg-amber-100 text-amber-800',
};

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate();
  const occupancyPercent =
    property.total_units > 0
      ? Math.round((property.occupied_units / property.total_units) * 100)
      : 0;

  return (
    <div
      onClick={() => navigate(`/properties/${property.id}`)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {property.name}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            typeBadgeColors[property.property_type] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {typeLabels[property.property_type] || property.property_type}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-500 truncate">{property.address}</p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {property.occupied_units}/{property.total_units} phòng đang thuê
          </span>
          <span className="font-medium text-gray-900">{occupancyPercent}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-primary-600 transition-all"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
