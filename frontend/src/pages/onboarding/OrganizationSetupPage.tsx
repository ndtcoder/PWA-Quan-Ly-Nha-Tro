import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateOrganization } from '../../api/organizations';
import { useAuthStore } from '../../stores/authStore';

const orgSetupSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
});

type OrgSetupFormData = z.infer<typeof orgSetupSchema>;

export default function OrganizationSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgSetupFormData>({
    resolver: zodResolver(orgSetupSchema),
    defaultValues: {
      name: user?.full_name || '',
    },
  });

  const onSubmit = async (data: OrgSetupFormData) => {
    setServerError('');
    setIsLoading(true);
    try {
      await updateOrganization({ name: data.name });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setServerError(
        error?.response?.data?.detail || 'Failed to update organization. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Dat ten to chuc
        </h1>
        <p className="text-center text-gray-600 text-sm mb-6">
          Day la ten hien thi cho he thong quan ly nha tro cua ban
        </p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {serverError}
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
            className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              'Tiep tuc'
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full mt-3 py-2 px-4 text-gray-500 hover:text-gray-700 text-sm font-medium text-center"
        >
          Bo qua, dung ten mac dinh
        </button>
      </div>
    </div>
  );
}
