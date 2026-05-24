import { insforge } from '@/lib/insforge'
import type { Category } from '@/types/database.types'
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/lib/validations/category'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Lee categorías predefinidas (user_id IS NULL) + las del user.
 * Las predefinidas vienen primero, ordenadas alfabéticamente cada grupo.
 */
export async function getCategories(userId: string): Promise<Result<Category[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const [{ data: predefined, error: e1 }, { data: userCats, error: e2 }] = await Promise.all([
      insforge.database.from('categories').select('*').is('user_id', null).order('name'),
      insforge.database.from('categories').select('*').eq('user_id', userId).order('name'),
    ])
    if (e1) throw e1
    if (e2) throw e2
    return { success: true, data: [...(predefined ?? []), ...(userCats ?? [])] as Category[] }
  } catch {
    return { success: false, error: 'Error al cargar categorías' }
  }
}

/**
 * Lee una categoría por id. Devuelve también las predefinidas (user_id IS NULL).
 * Bloquea acceso a categorías de otros users.
 */
export async function getCategoryById(
  id: string,
  userId: string
): Promise<Result<Category>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'Categoría no encontrada' }

    const cat = data as Category
    if (cat.user_id !== null && cat.user_id !== userId) {
      return { success: false, error: 'No tienes acceso a esta categoría' }
    }
    return { success: true, data: cat }
  } catch {
    return { success: false, error: 'Error al cargar categoría' }
  }
}

/**
 * Chequea si existe otra categoría del user con el mismo nombre (case-insensitive).
 * Si `excludeId` se pasa, esa fila se excluye del check (útil para updates).
 */
async function checkDuplicateName(
  userId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const { data } = await insforge.database
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)

  if (!data) return false

  return (data as Array<{ id: string; name: string }>).some((cat) => {
    if (excludeId && cat.id === excludeId) return false
    return cat.name.toUpperCase() === name.toUpperCase()
  })
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<Result<Category>> {
  try {
    const validated = createCategorySchema.parse(input)

    const isDuplicate = await checkDuplicateName(userId, validated.name)
    if (isDuplicate) {
      return {
        success: false,
        error: `Ya existe una categoría con el nombre "${validated.name}"`,
      }
    }

    const { data, error } = await insforge.database
      .from('categories')
      .insert([{ ...validated, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as Category }
  } catch {
    return { success: false, error: 'Error al crear categoría' }
  }
}

export async function updateCategory(
  id: string,
  userId: string,
  input: UpdateCategoryInput
): Promise<Result<Category>> {
  try {
    const validated = updateCategorySchema.parse(input)

    if (validated.name) {
      const isDuplicate = await checkDuplicateName(userId, validated.name, id)
      if (isDuplicate) {
        return {
          success: false,
          error: `Ya existe una categoría con el nombre "${validated.name}"`,
        }
      }
    }

    const { data, error } = await insforge.database
      .from('categories')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as Category }
  } catch {
    return { success: false, error: 'Error al actualizar categoría' }
  }
}

export async function deleteCategory(id: string, userId: string): Promise<Result> {
  try {
    // Verificar que no haya transacciones asociadas
    const { data: linkedTxs } = await insforge.database
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .eq('user_id', userId)
      .limit(1)

    if (linkedTxs && linkedTxs.length > 0) {
      return {
        success: false,
        error: 'No se puede eliminar: la categoría tiene transacciones asociadas',
      }
    }

    const { error } = await insforge.database
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar categoría' }
  }
}
