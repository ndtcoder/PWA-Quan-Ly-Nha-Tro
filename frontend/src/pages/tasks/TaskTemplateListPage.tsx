import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getTaskTemplates, deleteTaskTemplate } from '../../api/tasks';

const recurrenceBadgeColors: Record<string, string> = {
  once: 'bg-gray-100 text-gray-700',
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-green-100 text-green-700',
  monthly: 'bg-purple-100 text-purple-700',
  quarterly: 'bg-orange-100 text-orange-700',
};

const recurrenceLabels: Record<string, string> = {
  once: 'Một lần',
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
};

export default function TaskTemplateListPage() {
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['task-templates', activeFilter],
    queryFn: () => getTaskTemplates({ is_active: activeFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mẫu công việc</h1>
        <Link
          to="/tasks/templates/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Tạo mẫu
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveFilter(true)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            activeFilter === true
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Đang hoạt động
        </button>
        <button
          onClick={() => setActiveFilter(false)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            activeFilter === false
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Ngừng hoạt động
        </button>
        <button
          onClick={() => setActiveFilter(undefined)}
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            activeFilter === undefined
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Tất cả
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Chưa có mẫu nào.</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tần suất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người phụ trách</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {template.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {template.task_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recurrenceBadgeColors[template.recurrence_type] || recurrenceBadgeColors.once}`}>
                      {recurrenceLabels[template.recurrence_type] || template.recurrence_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.property_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.assigned_to_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <Link
                      to={`/tasks/templates/${template.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Sửa
                    </Link>
                    {template.is_active && (
                      <button
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Vô hiệu hóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
