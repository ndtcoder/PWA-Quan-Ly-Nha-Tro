import type { Task } from '../../types/task';

const priorityBadgeColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

export default function TaskCard({ task, compact = false }: TaskCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <h4 className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
          {task.title}
        </h4>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityBadgeColors[task.priority] || priorityBadgeColors.normal}`}>
          {task.priority}
        </span>
      </div>
      {task.property_name && (
        <p className="text-xs text-gray-500 mb-1">
          {task.property_name}
          {task.unit_number ? ` - ${task.unit_number}` : ''}
        </p>
      )}
      {task.due_date && (
        <p className="text-xs text-gray-400">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </p>
      )}
      {!compact && task.assigned_to_name && (
        <p className="text-xs text-gray-400 mt-1">
          Assigned to: {task.assigned_to_name}
        </p>
      )}
    </div>
  );
}
