import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyTasks, updateTask } from '../../api/tasks';
import type { Task } from '../../types/task';

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: getMyTasks,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      updateTask(id, {
        status: status as Task['status'],
        completion_notes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      setShowNotesFor(null);
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  const todayTasks = tasks.filter(
    (t) => t.due_date === today && t.status !== 'done' && t.status !== 'cancelled'
  );
  const thisWeekTasks = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date > today &&
      t.due_date <= endOfWeekStr &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
  );
  const upcomingTasks = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date > endOfWeekStr &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
  );
  const completedTasks = tasks.filter(
    (t) => t.status === 'done' || t.status === 'cancelled'
  );

  const handleStart = (taskId: string) => {
    updateMutation.mutate({ id: taskId, status: 'in_progress' });
  };

  const handleComplete = (taskId: string) => {
    const notes = completionNotes[taskId];
    updateMutation.mutate({ id: taskId, status: 'done', notes });
  };

  const renderTaskSection = (title: string, sectionTasks: Task[]) => {
    if (sectionTasks.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
        <div className="space-y-3">
          {sectionTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {task.property_name}
                    {task.unit_number ? ` - ${task.unit_number}` : ''}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStart(task.id)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Start
                    </button>
                  )}
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <button
                      onClick={() => setShowNotesFor(showNotesFor === task.id ? null : task.id)}
                      className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
              {showNotesFor === task.id && (
                <div className="mt-3 border-t pt-3">
                  <textarea
                    placeholder="Completion notes (optional)..."
                    value={completionNotes[task.id] || ''}
                    onChange={(e) =>
                      setCompletionNotes((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={updateMutation.isPending}
                    className="mt-2 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tasks assigned to you.</div>
      ) : (
        <>
          {renderTaskSection('Today', todayTasks)}
          {renderTaskSection('This Week', thisWeekTasks)}
          {renderTaskSection('Upcoming', upcomingTasks)}
          {renderTaskSection('Completed', completedTasks)}
        </>
      )}
    </div>
  );
}
