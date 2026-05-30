interface TimelineStep {
  label: string;
  status: 'completed' | 'active' | 'upcoming';
  date?: string;
}

interface MaintenanceStatusTimelineProps {
  currentStatus: string;
  assignedAt?: string;
  resolvedAt?: string;
  createdAt?: string;
}

function MaintenanceStatusTimeline({
  currentStatus,
  assignedAt,
  resolvedAt,
  createdAt,
}: MaintenanceStatusTimelineProps) {
  const statusOrder = ['open', 'assigned', 'in_progress', 'resolved'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const steps: TimelineStep[] = [
    {
      label: 'Open',
      status: currentIndex >= 0 ? (currentIndex === 0 ? 'active' : 'completed') : 'upcoming',
      date: createdAt,
    },
    {
      label: 'Assigned',
      status: currentIndex >= 1 ? (currentIndex === 1 ? 'active' : 'completed') : 'upcoming',
      date: assignedAt,
    },
    {
      label: 'In Progress',
      status: currentIndex >= 2 ? (currentIndex === 2 ? 'active' : 'completed') : 'upcoming',
      date: undefined,
    },
    {
      label: 'Resolved',
      status: currentIndex >= 3 ? 'active' : 'upcoming',
      date: resolvedAt,
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-start">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center mr-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step.status === 'completed'
                  ? 'bg-green-100 border-green-500 text-green-600'
                  : step.status === 'active'
                  ? 'bg-blue-100 border-blue-500 text-blue-600'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {step.status === 'completed' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    step.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-0.5 h-10 ${
                  step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>

          {/* Step content */}
          <div className="pb-8">
            <p
              className={`text-sm font-medium ${
                step.status === 'active'
                  ? 'text-blue-700'
                  : step.status === 'completed'
                  ? 'text-green-700'
                  : 'text-gray-500'
              }`}
            >
              {step.label}
            </p>
            {step.date && (
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(step.date)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MaintenanceStatusTimeline;
