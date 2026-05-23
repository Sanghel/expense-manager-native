import { z } from 'zod'

export const createBudgetSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.enum(['COP', 'USD', 'VES']),
  period: z.enum(['monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

export const updateBudgetSchema = createBudgetSchema.partial()

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
