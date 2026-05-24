import { z } from 'zod'

export const createLoanSchema = z.object({
  person_name: z.string().min(1, 'El nombre es requerido'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.enum(['COP', 'USD', 'VES']),
  account_id: z.string().uuid().nullable().optional(),
  type: z.enum(['lent', 'borrowed']),
  notes: z.string().nullable().optional(),
})

export const updateLoanSchema = createLoanSchema.partial()

export const createLoanPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.enum(['COP', 'USD', 'VES']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  notes: z.string().nullable().optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>
export type CreateLoanPaymentInput = z.infer<typeof createLoanPaymentSchema>
