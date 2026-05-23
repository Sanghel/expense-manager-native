import { z } from 'zod'

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  target_amount: z.number().positive('El monto objetivo debe ser positivo'),
  currency: z.enum(['COP', 'USD', 'VES']),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable().optional(),
})

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial()

export const addFundsSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
})

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>
export type AddFundsInput = z.infer<typeof addFundsSchema>
