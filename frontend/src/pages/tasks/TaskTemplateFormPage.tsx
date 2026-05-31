import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTaskTemplate, getTaskTemplate, updateTaskTemplate } from '../../api/tasks';
import { getProperties, getUnits } from '../../api/properties';
import RecurrenceFormFields from '../../components/tasks/RecurrenceFormFields';
import type { TaskTemplateCreate } from '../../types/task';

type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

const recurrenceLabels: Record<string, string> = {
  once: 'Một lần',
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
};

export default function TaskTemplateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<TaskTemplateCreate>({
    title: '',
    description: '',
    task_type: 'maintenance',
    property_id: '',
    assigned_to: '',
    priority: 'normal',
    recurrence_type: 'once',
    recurrence_start_date: new Date().toISOString().split('T')[0],
  });

  const { data: template } = useQuery({
    queryKey: ['task-template', id],
    queryFn: () => getTaskTemplate(id!),
    enabled: isEdit,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', form.property_id],
    queryFn: () => getUnits(form.property_id),
    enabled: !!form.property_id,
  });

  useEffect(() => {
    if (template) {
      setForm({
        title: template.title,
        description: template.description || '',
        task_type: template.task_type as TaskTemplateCreate['task_type'],
        property_id: template.property_id,
        unit_id: template.unit_id,
        assigned_to: template.assigned_to,
        priority: template.priority || 'normal',
        recurrence_type: template.recurrence_type,
        recurrence_day_of_week: template.recurrence_day_of_week,
        recurrence_day_of_month: template.recurrence_day_of_month,
        recurrence_month_of_quarter: template.recurrence_month_of_quarter,
        recurrence_start_date: template.recurrence_start_date,
        recurrence_end_date: template.recurrence_end_date,
      });
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: createTaskTemplate,
    onSuccess: () => navigate('/tasks/templates'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskTemplateCreate) => updateTaskTemplate(id!, data),
    onSuccess: () => navigate('/tasks/templates'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const updateField = (field: keyof TaskTemplateCreate, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getNextOccurrencesPreview = (): string[] => {
    if (form.recurrence_type === 'once') {
      return form.recurrence_start_date ? [form.recurrence_start_date] : [];
    }

    const dates: string[] = [];
    const start = form.recurrence_start_date
      ? new Date(form.recurrence_start_date)
      : new Date();
    const today = new Date();
    const current = new Date(Math.max(start.getTime(), today.getTime()));
    let iterations = 0;

    while (dates.length < 5 && iterations < 400) {
      let shouldInclude = false;
      const dayOfWeek = (current.getDay() + 6) % 7;

      if (form.recurrence_type === 'daily') {
        shouldInclude = true;
      } else if (form.recurrence_type === 'weekly') {
        shouldInclude = dayOfWeek === (form.recurrence_day_of_week ?? 0);
      } else if (form.recurrence_type === 'monthly') {
        shouldInclude = current.getDate() === (form.recurrence_day_of_month ?? 1);
      } else if (form.recurrence_type === 'quarterly') {
        const monthInQuarter = ((current.getMonth()) % 3) + 1;
        shouldInclude =
          current.getDate() === (form.recurrence_day_of_month ?? 1) &&
          monthInQuarter === (form.recurrence_month_of_quarter ?? 1);
      }

      if (shouldInclude) {
        dates.push(current.toISOString().split('T')[0]);
      }

      current.setDate(current.getDate() + 1);
      iterations++;
    }

    return dates;
  };

  const previewDates = getNextOccurrencesPreview();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Sửa mẫu công việc' : 'Tạo mẫu công việc'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
            <select
              value={form.task_type}
              onChange={(e) => updateField('task_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="maintenance">Bảo trì</option>
              <option value="cleaning">Vệ sinh</option>
              <option value="inspection">Kiểm tra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức ưu tiên</label>
            <select
              value={form.priority || 'normal'}
              onChange={(e) => updateField('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="low">Thấp</option>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhà</label>
          <select
            required
            value={form.property_id}
            onChange={(e) => {
              updateField('property_id', e.target.value);
              updateField('unit_id', undefined);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Chọn nhà --</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn phòng (tùy chọn)</label>
          <select
            value={form.unit_id || ''}
            onChange={(e) => updateField('unit_id', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            disabled={!form.property_id}
          >
            <option value="">-- Chọn phòng --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_number}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách (Staff ID)</label>
          <input
            type="text"
            required
            value={form.assigned_to}
            onChange={(e) => updateField('assigned_to', e.target.value)}
            placeholder="UUID nhân viên"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Loại tần suất */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tần suất lặp lại</label>
          <div className="flex flex-wrap gap-3">
            {(['once', 'daily', 'weekly', 'monthly', 'quarterly'] as RecurrenceType[]).map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence_type"
                  value={type}
                  checked={form.recurrence_type === type}
                  onChange={(e) => updateField('recurrence_type', e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">{recurrenceLabels[type]}</span>
              </label>
            ))}
          </div>
        </div>

        <RecurrenceFormFields
          recurrenceType={form.recurrence_type}
          dayOfWeek={form.recurrence_day_of_week}
          dayOfMonth={form.recurrence_day_of_month}
          monthOfQuarter={form.recurrence_month_of_quarter}
          onDayOfWeekChange={(v) => updateField('recurrence_day_of_week', v)}
          onDayOfMonthChange={(v) => updateField('recurrence_day_of_month', v)}
          onMonthOfQuarterChange={(v) => updateField('recurrence_month_of_quarter', v)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
            <input
              type="date"
              required
              value={form.recurrence_start_date}
              onChange={(e) => updateField('recurrence_start_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc (tùy chọn)</label>
            <input
              type="date"
              value={form.recurrence_end_date || ''}
              onChange={(e) => updateField('recurrence_end_date', e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Xem trước lần thực hiện tiếp theo */}
        {previewDates.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {previewDates.length} lần thực hiện tiếp theo:
            </h4>
            <ul className="space-y-1">
              {previewDates.map((d, i) => (
                <li key={i} className="text-sm text-gray-600">
                  {new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/tasks/templates')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Đang lưu...'
              : isEdit
              ? 'Cập nhật'
              : 'Tạo mới'}
          </button>
        </div>
      </form>
    </div>
  );
}
