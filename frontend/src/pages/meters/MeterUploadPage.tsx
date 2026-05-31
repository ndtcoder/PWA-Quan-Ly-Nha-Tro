import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProperties, getUnits } from '../../api/properties';
import { uploadMeterReading } from '../../api/meters';
import type { MeterReading } from '../../types/meter';
import OCRResultCard from '../../components/meter/OCRResultCard';

function MeterUploadPage() {
  const [step, setStep] = useState(1);
  const [meterType, setMeterType] = useState<'electricity' | 'water' | ''>('');
  const [previousReading, setPreviousReading] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [billingMonth, setBillingMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeterReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedPropertyId],
    queryFn: () => getUnits(selectedPropertyId),
    enabled: !!selectedPropertyId,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !meterType || !unitId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await uploadMeterReading({
        image: selectedFile,
        unit_id: unitId,
        meter_type: meterType,
        billing_month: billingMonth,
        previous_reading: previousReading ? parseFloat(previousReading) : undefined,
      });
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Tải lên thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Kết quả đọc đồng hồ
        </h1>
        <OCRResultCard
          reading={result}
          imagePreview={preview}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Tải ảnh đồng hồ
      </h1>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Chọn phòng và tháng */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin phòng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn nhà
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setUnitId('');
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">-- Chọn nhà --</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn phòng
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={!selectedPropertyId}
              >
                <option value="">-- Chọn phòng --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tháng thanh toán
              </label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Bước 1: Chọn loại đồng hồ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Bước 1: Chọn loại đồng hồ
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setMeterType('electricity');
                setStep(2);
              }}
              className={`p-6 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                meterType === 'electricity'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className="text-4xl">&#9889;</span>
              <span className="font-medium text-gray-900">Điện</span>
            </button>
            <button
              onClick={() => {
                setMeterType('water');
                setStep(2);
              }}
              className={`p-6 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                meterType === 'water'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className="text-4xl">&#128167;</span>
              <span className="font-medium text-gray-900">Nước</span>
            </button>
          </div>
        </div>

        {/* Bước 2: Chỉ số cũ */}
        {step >= 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Bước 2: Chỉ số cũ
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chỉ số đồng hồ trước đó (tùy chọn)
              </label>
              <input
                type="number"
                value={previousReading}
                onChange={(e) => setPreviousReading(e.target.value)}
                onFocus={() => setStep(3)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="VD: 12345"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nhập chỉ số ghi nhận lần trước để tính tiêu thụ.
              </p>
              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  className="mt-3 text-blue-600 text-sm hover:underline"
                >
                  Bỏ qua / Tiếp theo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bước 3: Tải ảnh */}
        {step >= 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Bước 3: Tải ảnh đồng hồ
            </h2>

            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
              >
                <div className="space-y-4">
                  <div className="text-4xl text-gray-400">&#128247;</div>
                  <p className="text-gray-600">
                    Kéo thả ảnh đồng hồ vào đây, hoặc
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Chọn tệp
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Chụp ảnh
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Xem trước đồng hồ"
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />
                  <button
                    onClick={handleRetake}
                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
                  >
                    Xóa
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedFile?.name} ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nút gửi */}
        {preview && meterType && unitId && (
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang đọc bằng AI...
                </>
              ) : (
                'Gửi để AI đọc chỉ số'
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeterUploadPage;
