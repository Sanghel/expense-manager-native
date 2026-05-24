import { z } from 'zod'

export const createReminderSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  category_id: z.string().uuid().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  frequency: z.enum(['once', 'weekly', 'monthly', 'yearly']),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  month_of_year: z.number().int().min(1).max(12).nullable().optional(),
  specific_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable().optional(),
  is_active: z.boolean().optional().default(true),
})

export const updateReminderSchema = createReminderSchema.partial()

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>
