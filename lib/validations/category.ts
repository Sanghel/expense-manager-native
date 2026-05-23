import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
