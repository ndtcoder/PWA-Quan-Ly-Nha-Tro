import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getMaintenanceRequest,
  assignMaintenanceRequest,
  resolveMaintenanceRequest,
  rateMaintenanceRequest,
  updateMaintenanceStatus,
} from '../../api/maintenance';
import type { MaintenanceRequest } from '../../types/maintenance';
import MaintenanceStatusTimeline from '../../components/maintenance/MaintenanceStatusTimeline';

function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionCost, setResolutionCost] = useState(0);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Mock: in a real app, get from auth store
  const userRole = 'owner';
  const userId = '';

  useEffect(() => {
    if (id) fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getMaintenanceRequest(id);
      setRequest(data);
    } catch (err) {
      console.error('Failed to fetch maintenance request', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !assignTo) return;
    try {
      const updated = await assignMaintenanceRequest(id, assignTo);
      setRequest(updated);
      setAssignModal(false);
      setAssignTo('');
    } catch (err) {
      console.error('Failed to assign', err);
    }
  };

  const handleStartProgress = async () => {
    if (!id) return;
    try {
      const updated = await updateMaintenanceStatus(id, 'in_progress');
      setRequest(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleResolve = async () => {
    if (!id || !resolutionNotes.trim()) return;
    try {
      const updated = await resolveMaintenanceRequest(id, {
        resolution_notes: resolutionNotes,
        cost: resolutionCost,
        resolution_photos: [],
      });
      setRequest(updated);
      setResolveModal(false);
    } catch (err) {
      console.error('Failed to resolve', err);
    }
  };

  const handleRate = async () => {
    if (!id || rating === 0) return;
    try {
      const updated = await rateMaintenanceRequest(id, {
        rating,
        feedback: feedback.trim() || undefined,
      });
      setRequest(updated);
      setRatingSubmitted(true);
    } catch (err) {
      console.error('Failed to rate', err);
    }
  };

  const getScopeBadge = (scope: string) => {
    if (scope === 'property') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Common Area
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
        Room
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      open: 'Open',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || styles.open
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 text-center text-gray-500">
        Maintenance request not found.
      </div>
    );
  }

  const canRate =
    request.status === 'resolved' &&
    request.scope === 'unit' &&
    request.submitted_by === userId &&
    !request.renter_rating &&
    !ratingSubmitted;

  const isOwnerManager = userRole === 'owner' || userRole === 'manager';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/maintenance"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Maintenance
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {getScopeBadge(request.scope)}
              {getStatusBadge(request.status)}
            </div>
          </div>
          {/* Action buttons */}
          {isOwnerManager && (
            <div className="flex gap-2">
              {request.status === 'open' && (
                <button
                  onClick={() => setAssignModal(true)}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Assign
                </button>
              )}
              {request.status === 'assigned' && (
                <button
                  onClick={handleStartProgress}
                  className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                >
                  Start Progress
                </button>
              )}
              {(request.status === 'in_progress' || request.status === 'assigned') && (
                <button
                  onClick={() => setResolveModal(true)}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Resolve
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          {request.photos && request.photos.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((photo, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={photo}
                      alt={`Maintenance photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Submitted by:</span>
                <p className="font-medium">
                  {request.submitter_name || 'Unknown'}{' '}
                  <span className="text-xs text-gray-400">
                    ({request.submitter_role})
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-500">Category:</span>
                <p className="font-medium capitalize">{request.category}</p>
              </div>
              <div>
                <span className="text-gray-500">Priority:</span>
                <p className="font-medium capitalize">{request.priority}</p>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <p className="font-medium">
                  {request.scope === 'property'
                    ? request.location_detail || request.property_name
                    : `Unit ${request.unit_number || ''} - ${request.property_name || ''}`}
                </p>
              </div>
              {request.assigned_to_name && (
                <div>
                  <span className="text-gray-500">Assigned to:</span>
                  <p className="font-medium">{request.assigned_to_name}</p>
                </div>
              )}
              {request.cost > 0 && (
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <p className="font-medium">
                    {request.cost.toLocaleString('vi-VN')} VND
                  </p>
                </div>
              )}
            </div>
            {request.description && (
              <div className="pt-3 border-t">
                <span className="text-sm text-gray-500">Description:</span>
                <p className="text-sm mt-1 text-gray-900">
                  {request.description}
                </p>
              </div>
            )}
          </div>

          {/* Resolution */}
          {request.status === 'resolved' && request.resolution_notes && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Resolution
              </h3>
              <p className="text-sm text-gray-900">{request.resolution_notes}</p>
              {request.resolution_photos && request.resolution_photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {request.resolution_photos.map((photo, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                    >
                      <img
                        src={photo}
                        alt={`Resolution photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rating */}
          {canRate && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Rate this resolution
              </h3>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback..."
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
              />
              <button
                onClick={handleRate}
                disabled={rating === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          )}

          {/* Show existing rating */}
          {request.renter_rating && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Renter Rating
              </h3>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-lg ${
                      star <= request.renter_rating!
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              {request.renter_feedback && (
                <p className="text-sm text-gray-600">{request.renter_feedback}</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Status Timeline
            </h3>
            <MaintenanceStatusTimeline
              currentStatus={request.status}
              assignedAt={request.assigned_at}
              resolvedAt={request.resolved_at}
              createdAt={request.created_at}
            />
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Assign Maintenance Request
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to (Staff ID)
              </label>
              <input
                type="text"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                placeholder="Enter staff member ID"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssign}
                disabled={!assignTo}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => setAssignModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Resolve Maintenance Request
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost (VND)
              </label>
              <input
                type="number"
                value={resolutionCost}
                onChange={(e) => setResolutionCost(Number(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResolve}
                disabled={!resolutionNotes.trim()}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Resolve
              </button>
              <button
                onClick={() => setResolveModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaintenanceDetailPage;
