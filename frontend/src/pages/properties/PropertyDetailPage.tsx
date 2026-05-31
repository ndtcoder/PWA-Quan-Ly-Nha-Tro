import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProperty, getUnits } from '../../api/properties';
import UnitGrid from '../../components/property/UnitGrid';
import UnitFormModal from '../units/UnitFormModal';
import Spinner from '../../components/ui/Spinner';
import { useAuthStore } from '../../stores/authStore';

const typeLabels: Record<string, string> = {
  house: 'Nhà trọ',
  apartment_building: 'Chung cư',
  villa: 'Biệt thự',
};

const tabs = ['Phòng', 'Thông tin', 'Bảo trì', 'Báo cáo'];

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('Phòng');
  const [showUnitModal, setShowUnitModal] = useState(false);

  const { data: property, isLoading: loadingProperty } = useQuery({
    queryKey: ['property', id],
    queryFn: () => getProperty(id!),
    enabled: !!id,
  });

  const { data: units, isLoading: loadingUnits } = useQuery({
    queryKey: ['units', id],
    queryFn: () => getUnits(id!),
    enabled: !!id,
  });

  if (loadingProperty) {
    return <Spinner className="py-12" />;
  }

  if (!property) {
    return <p className="text-gray-500 py-8">Không tìm thấy nhà cho thuê.</p>;
  }

  const vacantCount = property.total_units - property.occupied_units;

  return (
    <div>
      {/* Tiêu đề */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{property.address}</p>
          {property.property_type && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 mt-2">
              {typeLabels[property.property_type] || property.property_type}
            </span>
          )}
        </div>
        {user?.role === 'owner' && (
          <button
            onClick={() => navigate(`/properties/${id}/edit`)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Sửa
          </button>
        )}
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg bg-white border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{property.total_units}</p>
          <p className="text-xs text-gray-500">Tổng phòng</p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{property.occupied_units}</p>
          <p className="text-xs text-gray-500">Đang thuê</p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{vacantCount}</p>
          <p className="text-xs text-gray-500">Trống</p>
        </div>
      </div>

      {/* Tab */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Nội dung tab */}
      {activeTab === 'Phòng' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sơ đồ phòng</h2>
            {(user?.role === 'owner' || user?.role === 'manager') && (
              <button
                onClick={() => setShowUnitModal(true)}
                className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              >
                + Thêm phòng
              </button>
            )}
          </div>
          {loadingUnits ? (
            <Spinner className="py-8" />
          ) : (
            <UnitGrid units={units || []} />
          )}
        </div>
      )}

      {activeTab === 'Thông tin' && (
        <div className="space-y-3 text-sm text-gray-700">
          {property.description && <p>{property.description}</p>}
          {property.ward && <p><span className="font-medium">Phường/Xã:</span> {property.ward}</p>}
          {property.district && <p><span className="font-medium">Quận/Huyện:</span> {property.district}</p>}
          {property.city && <p><span className="font-medium">Thành phố:</span> {property.city}</p>}
        </div>
      )}

      {activeTab === 'Bảo trì' && (
        <p className="text-sm text-gray-500 py-4">Theo dõi bảo trì sẽ sớm ra mắt.</p>
      )}

      {activeTab === 'Báo cáo' && (
        <p className="text-sm text-gray-500 py-4">Báo cáo sẽ sớm ra mắt.</p>
      )}

      {/* Modal thêm phòng */}
      {showUnitModal && id && (
        <UnitFormModal
          propertyId={id}
          onClose={() => setShowUnitModal(false)}
        />
      )}
    </div>
  );
}
