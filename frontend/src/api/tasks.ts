import apiClient from './client';
import type {
  Task,
  TaskTemplate,
  TaskTemplateCreate,
  TaskTemplateUpdate,
  TaskUpdate,
  CalendarTask,
} from '../types/task';

// Task Templates
export async function getTaskTemplates(params?: {
  property_id?: string;
  recurrence_type?: string;
  is_active?: boolean;
}): Promise<TaskTemplate[]> {
  const response = await apiClient.get('/api/v1/tasks/task-templates', { params });
  return response.data;
}

export async function createTaskTemplate(data: TaskTemplateCreate): Promise<TaskTemplate> {
  const response = await apiClient.post('/api/v1/tasks/task-templates', data);
  return response.data;
}

export async function getTaskTemplate(id: string): Promise<TaskTemplate> {
  const response = await apiClient.get(`/api/v1/tasks/task-templates/${id}`);
  return response.data;
}

export async function updateTaskTemplate(id: string, data: TaskTemplateUpdate): Promise<TaskTemplate> {
  const response = await apiClient.patch(`/api/v1/tasks/task-templates/${id}`, data);
  return response.data;
}

export async function deleteTaskTemplate(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete(`/api/v1/tasks/task-templates/${id}`);
  return response.data;
}

// Tasks
export async function getTasks(params?: {
  assigned_to?: string;
  status?: string;
  property_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Task[]> {
  const response = await apiClient.get('/api/v1/tasks', { params });
  return response.data;
}

export async function getTask(id: string): Promise<Task> {
  const response = await apiClient.get(`/api/v1/tasks/${id}`);
  return response.data;
}

export async function updateTask(id: string, data: TaskUpdate): Promise<Task> {
  const response = await apiClient.patch(`/api/v1/tasks/${id}`, data);
  return response.data;
}

export async function getMyTasks(): Promise<Task[]> {
  const response = await apiClient.get('/api/v1/tasks/my-tasks');
  return response.data;
}

export async function getCalendarTasks(start: string, end: string): Promise<CalendarTask[]> {
  const response = await apiClient.get('/api/v1/tasks/calendar', {
    params: { start, end },
  });
  return response.data;
}

export async function triggerScheduler(): Promise<{ tasks_created: number; date: string }> {
  const response = await apiClient.post('/api/v1/tasks/trigger-scheduler');
  return response.data;
}
