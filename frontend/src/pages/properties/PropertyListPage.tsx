import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProperties } from '../../api/properties';
import PropertyCard from '../../components/property/PropertyCard';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';

const propertyTypes = [
  { value: '', label: 'Tất cả loại' },
  { value: 'house', label: 'Nhà' },
  { value: 'apartment_building', label: 'Chung cư' },
  { value: 'villa', label: 'Biệt thự' },
];

export default function PropertyListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', { city: city || undefined, property_type: propertyType || undefined }],
    queryFn: () =>
      getProperties({
        city: city || undefined,
        property_type: propertyType || undefined,
      }),
  });

  const handleReset = () => {
    setCity('');
    setPropertyType('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nhà cho thuê</h1>
        {user?.role === 'owner' && (
          <button
            onClick={() => navigate('/properties/new')}
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            + Thêm nhà
          </button>
        )}
      </div>

      {/* Thanh lọc */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Lọc theo thành phố..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          {propertyTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Đặt lại
        </button>
      </div>

      {/* Nội dung */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      ) : !properties || properties.length === 0 ? (
        <EmptyState
          title="Chưa có nhà cho thuê"
          message="Bắt đầu bằng cách thêm nhà cho thuê đầu tiên."
          action={
            user?.role === 'owner' ? (
              <button
                onClick={() => navigate('/properties/new')}
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              >
                + Thêm nhà
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
