import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMyOrganization, updateOrganization } from '../../api/organizations';

const orgSettingsSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
});

type OrgSettingsFormData = z.infer<typeof orgSettingsSchema>;

export default function OrganizationSettingsPage() {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrgSettingsFormData>({
    resolver: zodResolver(orgSettingsSchema),
  });

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await getMyOrganization();
        reset({ name: response.data.name });
      } catch {
        setServerError('Failed to load organization details.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchOrganization();
  }, [reset]);

  const onSubmit = async (data: OrgSettingsFormData) => {
    setServerError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      await updateOrganization({ name: data.name });
      setSuccessMessage('Luu thay doi thanh cong!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setServerError(
        error?.response?.data?.detail || 'Failed to update organization. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cai dat to chuc</h1>

      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="org_name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ten to chuc
          </label>
          <input
            id="org_name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="VD: Nha tro Binh Minh"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            'Luu thay doi'
          )}
        </button>
      </form>
    </div>
  );
}
