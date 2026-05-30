import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUnit, updateUnit } from '../../api/properties';
import type { Unit } from '../../types/property';

const amenityOptions = [
  'wifi',
  'ac',
  'parking',
  'water_heater',
  'fridge',
  'washing_machine',
];

const unitSchema = z.object({
  unit_number: z.string().min(1, 'Unit number is required'),
  floor: z.coerce.number().int().optional().or(z.literal('')),
  area_sqm: z.coerce.number().positive().optional().or(z.literal('')),
  base_rent: z.coerce.number().positive('Base rent is required'),
  deposit_amount: z.coerce.number().optional().or(z.literal('')),
  max_occupants: z.coerce.number().int().min(1).default(2),
  amenities: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;

interface UnitFormModalProps {
  propertyId: string;
  unit?: Unit;
  onClose: () => void;
}

export default function UnitFormModal({ propertyId, unit, onClose }: UnitFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!unit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: '',
      max_occupants: 2,
      amenities: [],
      base_rent: 0,
    },
  });

  useEffect(() => {
    if (unit) {
      reset({
        unit_number: unit.unit_number,
        floor: unit.floor ?? '',
        area_sqm: unit.area_sqm ?? '',
        base_rent: unit.base_rent,
        deposit_amount: unit.deposit_amount ?? '',
        max_occupants: unit.max_occupants,
        amenities: unit.amenities || [],
        notes: unit.notes || '',
      });
    }
  }, [unit, reset]);

  const createMutation = useMutation({
    mutationFn: (data: UnitFormData) => {
      const payload = {
        ...data,
        floor: data.floor === '' ? undefined : data.floor,
        area_sqm: data.area_sqm === '' ? undefined : data.area_sqm,
        deposit_amount: data.deposit_amount === '' ? undefined : data.deposit_amount,
      };
      return createUnit(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UnitFormData) => {
      const payload = {
        ...data,
        floor: data.floor === '' ? undefined : data.floor,
        area_sqm: data.area_sqm === '' ? undefined : data.area_sqm,
        deposit_amount: data.deposit_amount === '' ? undefined : data.deposit_amount,
      };
      return updateUnit(unit!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['unit', unit!.id] });
      onClose();
    },
  });

  const onSubmit = (data: UnitFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Unit' : 'Add Unit'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit Number *</label>
            <input
              type="text"
              {...register('unit_number')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            {errors.unit_number && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_number.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Floor</label>
              <input
                type="number"
                {...register('floor')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Area (sqm)</label>
              <input
                type="number"
                step="0.01"
                {...register('area_sqm')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Base Rent (VND) *</label>
              <input
                type="number"
                {...register('base_rent')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.base_rent && (
                <p className="mt-1 text-sm text-red-600">{errors.base_rent.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deposit (VND)</label>
              <input
                type="number"
                {...register('deposit_amount')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Occupants</label>
            <input
              type="number"
              min="1"
              {...register('max_occupants')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="grid grid-cols-2 gap-2">
              {amenityOptions.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    value={amenity}
                    {...register('amenities')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {amenity.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Unit' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
