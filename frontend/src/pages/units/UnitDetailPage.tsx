import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUnit, getUnitHistory } from '../../api/properties';
import Spinner from '../../components/ui/Spinner';
import UnitFormModal from './UnitFormModal';
import { useAuthStore } from '../../stores/authStore';
import type { UnitHistory } from '../../types/property';

const statusBadge: Record<string, string> = {
  vacant: 'bg-green-100 text-green-800',
  occupied: 'bg-red-100 text-red-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
};

const tabs = ['Info', 'Contract', 'Invoices', 'Maintenance'];

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('Info');
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => getUnit(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['unit-history', id],
    queryFn: () => getUnitHistory(id!),
    enabled: !!id && activeTab === 'Contract',
  });

  if (isLoading) {
    return <Spinner className="py-12" />;
  }

  if (!unit) {
    return <p className="text-gray-500 py-8">Unit not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Room {unit.unit_number}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusBadge[unit.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {unit.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Base rent: {unit.base_rent?.toLocaleString()} VND/month
          </p>
          {unit.current_renter_name && (
            <p className="text-sm text-gray-600 mt-1">
              Current renter: <span className="font-medium">{unit.current_renter_name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {(user?.role === 'owner' || user?.role === 'manager') && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Tab content */}
      {activeTab === 'Info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {unit.floor != null && (
              <div>
                <span className="font-medium text-gray-700">Floor:</span>{' '}
                <span className="text-gray-900">{unit.floor}</span>
              </div>
            )}
            {unit.area_sqm != null && (
              <div>
                <span className="font-medium text-gray-700">Area:</span>{' '}
                <span className="text-gray-900">{unit.area_sqm} sqm</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Max Occupants:</span>{' '}
              <span className="text-gray-900">{unit.max_occupants}</span>
            </div>
            {unit.deposit_amount != null && (
              <div>
                <span className="font-medium text-gray-700">Deposit:</span>{' '}
                <span className="text-gray-900">{unit.deposit_amount.toLocaleString()} VND</span>
              </div>
            )}
          </div>

          {unit.amenities && unit.amenities.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700">Amenities:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {unit.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {unit.notes && (
            <div>
              <span className="text-sm font-medium text-gray-700">Notes:</span>
              <p className="text-sm text-gray-600 mt-1">{unit.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Contract' && (
        <div>
          {history && history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Renter</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Period</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Rent</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h: UnitHistory) => (
                    <tr key={h.id}>
                      <td className="px-3 py-2 text-gray-900">{h.renter_name}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {h.start_date} - {h.end_date}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {h.monthly_rent.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">No contract history for this unit.</p>
          )}
        </div>
      )}

      {activeTab === 'Invoices' && (
        <p className="text-sm text-gray-500 py-4">Invoices coming soon.</p>
      )}

      {activeTab === 'Maintenance' && (
        <p className="text-sm text-gray-500 py-4">Maintenance history coming soon.</p>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <UnitFormModal
          propertyId={unit.property_id}
          unit={unit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
