import { insforge } from '@/lib/insforge'
import type { User } from '@/types/database.types'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Patch parcial de campos editables del user. Solo los campos que el cliente
 * puede modificar — NO incluye id, email, created_at, gmail_* (esos cambian
 * por otros flows server-side).
 */
type UpdateUserPatch = Partial<
  Pick<User, 'name' | 'avatar_url' | 'preferred_currency'>
>

export async function updateUser(
  userId: string,
  patch: UpdateUserPatch
): Promise<Result<User>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as User }
  } catch {
    return { success: false, error: 'Error al actualizar perfil' }
  }
}
