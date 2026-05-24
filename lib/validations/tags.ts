import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().min(1, 'El nombre del tag es requerido'),
  color: z.string().default('#3182CE'),
})

export const updateTagSchema = createTagSchema.partial()

export const addTagToTransactionSchema = z.object({
  tag_id: z.string().uuid(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type AddTagToTransactionInput = z.infer<typeof addTagToTransactionSchema>
