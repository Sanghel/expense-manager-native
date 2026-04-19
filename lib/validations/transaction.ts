import { z } from 'zod'

export const createTransactionSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.enum(['COP', 'USD', 'VES']),
  type: z.enum(['income', 'expense']),
  category_id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1, 'La descripción es requerida'),
  date: z.string(),
  notes: z.string().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
