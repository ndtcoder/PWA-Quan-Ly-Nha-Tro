import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMaintenanceRequest } from '../../api/maintenance';
import type { MaintenanceCreateData } from '../../types/maintenance';

type Scope = 'property' | 'unit';
type Category = 'electrical' | 'plumbing' | 'furniture' | 'structure' | 'other';

function MaintenanceFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState<Scope | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [priority, setPriority] = useState('normal');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mock: In a real app, get from auth store
  const userRole: string = 'owner';

  const handleScopeSelect = (selected: Scope) => {
    setScope(selected);
    setStep(2);
  };

  const handleLocationNext = () => {
    if (scope === 'property' && !locationDetail.trim()) {
      setError('Vị trí cụ thể là bắt buộc cho yêu cầu khu vực chung');
      return;
    }
    if (!propertyId) {
      setError('Vui lòng chọn nhà');
      return;
    }
    if (scope === 'unit' && !unitId) {
      setError('Vui lòng chọn phòng');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Tiêu đề là bắt buộc');
      return;
    }
    if (!scope) return;

    setSubmitting(true);
    setError('');

    try {
      const data: MaintenanceCreateData = {
        scope,
        property_id: propertyId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        photos: [],
      };

      if (scope === 'unit') {
        data.unit_id = unitId;
      } else {
        data.location_detail = locationDetail.trim();
      }

      await createMaintenanceRequest(data);
      navigate('/maintenance');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Tạo yêu cầu thất bại';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 5 - photos.length);
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const categoryOptions: { value: Category; label: string; icon: string }[] = [
    { value: 'electrical', label: 'Điện', icon: '⚡' },
    { value: 'plumbing', label: 'Nước', icon: '🔧' },
    { value: 'furniture', label: 'Nội thất', icon: '🪑' },
    { value: 'structure', label: 'Kết cấu', icon: '🏗️' },
    { value: 'other', label: 'Khác', icon: '📋' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Thấp', color: 'border-gray-300 bg-gray-50' },
    { value: 'normal', label: 'Bình thường', color: 'border-blue-300 bg-blue-50' },
    { value: 'high', label: 'Cao', color: 'border-orange-300 bg-orange-50' },
    { value: 'urgent', label: 'Khẩn cấp', color: 'border-red-300 bg-red-50' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Yêu cầu bảo trì mới
      </h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Scope Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            Khu vực nào cần bảo trì?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(userRole !== 'renter') && (
              <button
                onClick={() => handleScopeSelect('property')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">🏢</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Khu vực chung
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Hành lang, bãi đỗ xe, sảnh, thang máy, v.v.
                </p>
              </button>
            )}
            <button
              onClick={() => handleScopeSelect('unit')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="text-3xl mb-3">🚪</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Phòng cụ thể
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Sự cố bên trong một phòng cho thuê cụ thể
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            {scope === 'property'
              ? 'Chọn nhà và mô tả vị trí'
              : 'Chọn nhà và phòng'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhà cho thuê
            </label>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="Nhập mã nhà"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {scope === 'property' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vị trí cụ thể <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="VD: Hành lang tầng 2, bãi đỗ xe B"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}

          {scope === 'unit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phòng
              </label>
              <input
                type="text"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="Nhập mã phòng"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleLocationNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mô tả ngắn gọn sự cố"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết sự cố..."
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCategory(opt.value)}
                  className={`p-3 border-2 rounded-lg text-center transition-colors ${
                    category === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="text-xs font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức ưu tiên
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`p-3 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
                    priority === opt.value
                      ? `${opt.color} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ảnh (tối đa 5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
                disabled={photos.length >= 5}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-700"
              >
                {photos.length >= 5
                  ? 'Đã đạt số ảnh tối đa'
                  : 'Nhấn để tải lên hoặc kéo thả'}
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {photos.length}/5 photos
              </p>
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaintenanceFormPage;
