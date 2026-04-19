import { insforge } from '@/lib/insforge'
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '@/lib/validations/account'
import type { Account } from '@/types/database.types'

export async function getAccounts(userId: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return { success: true, data: (data ?? []) as Account[] }
  } catch {
    return { success: false, error: 'Error al cargar cuentas' }
  }
}

export async function getAccountById(
  id: string,
  userId: string
): Promise<{ success: boolean; data?: Account; error?: string }> {
  if (!id || !userId) return { success: false, error: 'Parámetros requeridos' }
  try {
    const { data, error } = await insforge.database
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Cuenta no encontrada' }
    return { success: true, data: data as Account }
  } catch {
    return { success: false, error: 'Error al cargar cuenta' }
  }
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createAccountSchema.parse(input)
    const { error } = await insforge.database
      .from('accounts')
      .insert([{ ...validated, user_id: userId }])
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al crear cuenta' }
  }
}

export async function updateAccount(
  id: string,
  userId: string,
  input: UpdateAccountInput
): Promise<{ success: boolean; error?: string }> {
  if (!id || !userId) return { success: false, error: 'Parámetros requeridos' }
  try {
    const validated = updateAccountSchema.parse(input)
    const { error } = await insforge.database
      .from('accounts')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al actualizar cuenta' }
  }
}

export async function deleteAccount(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!id || !userId) return { success: false, error: 'Parámetros requeridos' }
  try {
    const { data: movements } = await insforge.database
      .from('account_movements')
      .select('id')
      .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)
      .limit(1)

    if (movements && movements.length > 0) {
      return { success: false, error: 'No se puede eliminar: la cuenta tiene movimientos asociados' }
    }

    const { error } = await insforge.database
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar cuenta'
    return { success: false, error: msg }
  }
}
