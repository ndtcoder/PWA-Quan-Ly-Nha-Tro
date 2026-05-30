import { useState } from 'react';
import { approveMeterReading } from '../../api/meters';
import type { MeterReading } from '../../types/meter';

interface OCRResultCardProps {
  reading: MeterReading;
  imagePreview?: string | null;
  onRetake?: () => void;
}

function OCRResultCard({ reading, imagePreview, onRetake }: OCRResultCardProps) {
  const [editValue, setEditValue] = useState(
    reading.ai_detected_value?.toString() || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);

  const confidence = reading.ai_confidence ?? 0;
  const isLowConfidence = confidence < 0.6;

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const val = editValue ? parseFloat(editValue) : undefined;
      await approveMeterReading(reading.id, { approved_value: val });
      setApproved(true);
    } catch (err) {
      console.error('Failed to approve', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (approved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">&#10003;</div>
        <h3 className="text-lg font-semibold text-green-800">
          Reading Approved
        </h3>
        <p className="text-green-600 mt-1">
          Value: {editValue || reading.ai_detected_value}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {isLowConfidence && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2">
          <span className="text-red-500 text-lg">&#9888;</span>
          <span className="text-red-800 text-sm font-medium">
            Image unclear, please verify manually
          </span>
        </div>
      )}

      <div className="p-6 flex flex-col md:flex-row gap-6">
        {/* Left: Image thumbnail */}
        <div className="md:w-1/3 flex-shrink-0">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Meter photo"
              className="w-full rounded-lg border object-contain max-h-48"
            />
          ) : reading.photo_url ? (
            <img
              src={reading.photo_url}
              alt="Meter photo"
              className="w-full rounded-lg border object-contain max-h-48"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">AI Detected Value</p>
            <p className="text-4xl font-bold text-gray-900">
              {reading.ai_detected_value ?? 'N/A'}
            </p>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Confidence</span>
              <span className="text-sm font-medium text-gray-700">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getConfidenceColor()}`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Editable input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmed Value
            </label>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg"
              placeholder="Enter corrected value"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Confirm and Submit'}
            </button>
            {onRetake && (
              <button
                onClick={onRetake}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Retake Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OCRResultCard;
