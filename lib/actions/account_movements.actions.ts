import { insforge } from '@/lib/insforge'
import {
  createAccountMovementSchema,
  type CreateAccountMovementInput,
} from '@/lib/validations/account'
import type { AccountMovementWithAccounts } from '@/types/database.types'

export async function getAccountMovements(
  userId: string
): Promise<{ success: boolean; data?: AccountMovementWithAccounts[]; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('account_movements')
      .select('*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: (data ?? []) as AccountMovementWithAccounts[] }
  } catch {
    return { success: false, error: 'Error al cargar movimientos' }
  }
}

export async function createAccountMovement(
  userId: string,
  input: CreateAccountMovementInput
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createAccountMovementSchema.parse(input)
    if (validated.from_account_id === validated.to_account_id) {
      return { success: false, error: 'La cuenta origen y destino no pueden ser la misma' }
    }
    const { error } = await insforge.database
      .from('account_movements')
      .insert([{ ...validated, user_id: userId }])
    if (error) throw error

    const [{ error: rpcError1 }, { error: rpcError2 }] = await Promise.all([
      insforge.database.rpc('decrement_account_balance', {
        account_id: validated.from_account_id,
        amount: validated.from_amount,
      }),
      insforge.database.rpc('increment_account_balance', {
        account_id: validated.to_account_id,
        amount: validated.to_amount,
      }),
    ])
    if (rpcError1) throw rpcError1
    if (rpcError2) throw rpcError2
    return { success: true }
  } catch {
    return { success: false, error: 'Error al registrar movimiento' }
  }
}

export async function deleteAccountMovement(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!id || !userId) return { success: false, error: 'Parámetros requeridos' }
  try {
    const { data: movement } = await insforge.database
      .from('account_movements')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!movement) return { success: false, error: 'Movimiento no encontrado' }

    const { error } = await insforge.database
      .from('account_movements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error

    const [{ error: rpcError1 }, { error: rpcError2 }] = await Promise.all([
      insforge.database.rpc('increment_account_balance', {
        account_id: movement.from_account_id,
        amount: movement.from_amount,
      }),
      insforge.database.rpc('decrement_account_balance', {
        account_id: movement.to_account_id,
        amount: movement.to_amount,
      }),
    ])
    if (rpcError1) throw rpcError1
    if (rpcError2) throw rpcError2
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar movimiento' }
  }
}
