import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getInvoice, sendInvoice, markInvoicePaid } from '../../api/invoices';
import InvoiceStatusBadge from '../../components/invoice/InvoiceStatusBadge';
import InvoiceItemsTable from '../../components/invoice/InvoiceItemsTable';
import QRPaymentCard from '../../components/invoice/QRPaymentCard';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paidAmount, setPaidAmount] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      markInvoicePaid(id!, {
        payment_method: paymentMethod,
        paid_amount: parseFloat(paidAmount) || invoice?.total || 0,
      }),
    onSuccess: () => {
      setShowPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-8 text-gray-500">Invoice not found.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send to Renter
            </button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => {
                setPaidAmount(invoice.total.toString());
                setShowPayModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Billing Period</p>
            <p className="font-medium">{invoice.billing_period_start} - {invoice.billing_period_end}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Due Date</p>
            <p className="font-medium">{invoice.due_date}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Renter</p>
            <p className="font-medium">{invoice.renter_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Unit</p>
            <p className="font-medium">{invoice.unit_number || '-'}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Invoice Items</h2>
        <InvoiceItemsTable items={invoice.items} />
      </div>

      {/* Total */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-500">Subtotal: {invoice.subtotal.toLocaleString()} VND</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              Total: {invoice.total.toLocaleString()} VND
            </p>
            {invoice.paid_amount > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Paid: {invoice.paid_amount.toLocaleString()} VND
                {invoice.paid_at && ` on ${invoice.paid_at.split('T')[0]}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* QR Payment Card - shown when not paid */}
      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <QRPaymentCard
          invoiceId={invoice.id}
          qrImageBase64={invoice.qr_image_base64}
          refCode={invoice.vietqr_ref_code}
          total={invoice.total}
        />
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
          <p className="text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Mark Invoice as Paid</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="momo">MoMo</option>
                  <option value="zalopay">ZaloPay</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid Amount (VND)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPayModal(false)}
                className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => markPaidMutation.mutate()}
                disabled={markPaidMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
