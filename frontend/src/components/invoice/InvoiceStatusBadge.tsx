interface InvoiceStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-700',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-200 text-gray-600',
  },
};

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
