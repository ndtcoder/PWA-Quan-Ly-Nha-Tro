interface RecurrenceFormFieldsProps {
  recurrenceType: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfQuarter?: number;
  onDayOfWeekChange: (value: number) => void;
  onDayOfMonthChange: (value: number) => void;
  onMonthOfQuarterChange: (value: number) => void;
}

const daysOfWeek = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export default function RecurrenceFormFields({
  recurrenceType,
  dayOfWeek,
  dayOfMonth,
  monthOfQuarter,
  onDayOfWeekChange,
  onDayOfMonthChange,
  onMonthOfQuarterChange,
}: RecurrenceFormFieldsProps) {
  if (recurrenceType === 'once' || recurrenceType === 'daily') {
    return null;
  }

  return (
    <div className="space-y-4">
      {recurrenceType === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Week
          </label>
          <select
            value={dayOfWeek ?? 0}
            onChange={(e) => onDayOfWeekChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {daysOfWeek.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(recurrenceType === 'monthly' || recurrenceType === 'quarterly') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Month
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth ?? 1}
            onChange={(e) => onDayOfMonthChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      )}

      {recurrenceType === 'quarterly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month in Quarter (1st, 2nd, or 3rd month)
          </label>
          <select
            value={monthOfQuarter ?? 1}
            onChange={(e) => onMonthOfQuarterChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value={1}>1st month</option>
            <option value={2}>2nd month</option>
            <option value={3}>3rd month</option>
          </select>
        </div>
      )}
    </div>
  );
}
