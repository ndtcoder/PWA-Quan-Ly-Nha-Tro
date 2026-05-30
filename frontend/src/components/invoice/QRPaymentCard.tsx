import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoice } from '../../api/invoices';

interface QRPaymentCardProps {
  invoiceId: string;
  qrImageBase64?: string;
  refCode?: string;
  total: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export default function QRPaymentCard({
  invoiceId,
  qrImageBase64,
  refCode,
  total,
  bankName = 'VietQR',
  bankAccountNumber = '',
  bankAccountName = '',
}: QRPaymentCardProps) {
  const [copied, setCopied] = useState(false);

  // Auto-refresh to poll invoice status every 30 seconds
  useQuery({
    queryKey: ['invoice-poll', invoiceId],
    queryFn: () => getInvoice(invoiceId),
    refetchInterval: 30000,
  });

  const handleCopyRefCode = async () => {
    if (refCode) {
      try {
        await navigator.clipboard.writeText(refCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = refCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Payment via QR Code</h3>

      {/* QR Image */}
      {qrImageBase64 && (
        <div className="flex justify-center mb-4">
          <img
            src={`data:image/png;base64,${qrImageBase64}`}
            alt="VietQR Payment Code"
            className="w-[200px] h-[200px]"
          />
        </div>
      )}

      {/* Bank Transfer Info */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Bank:</span>
          <span className="font-medium">{bankName}</span>
        </div>
        {bankAccountNumber && (
          <div className="flex justify-between">
            <span className="text-gray-500">Account Number:</span>
            <span className="font-medium">{bankAccountNumber}</span>
          </div>
        )}
        {bankAccountName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Account Name:</span>
            <span className="font-medium">{bankAccountName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Amount:</span>
          <span className="font-medium text-blue-600">{total.toLocaleString()} VND</span>
        </div>
        {refCode && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Transfer Content:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-sm bg-gray-100 px-2 py-1 rounded">
                {refCode}
              </span>
              <button
                onClick={handleCopyRefCode}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center justify-center gap-2 py-3 bg-yellow-50 rounded-lg">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
        <span className="text-sm text-yellow-700 font-medium">Waiting for payment...</span>
      </div>
    </div>
  );
}
