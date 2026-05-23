import { insforge } from '@/lib/insforge'
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/lib/validations/transaction'
import type { TransactionWithCategory } from '@/types/database.types'

export async function getTransactions(
  userId: string,
  limit = 100
): Promise<{ success: boolean; data?: TransactionWithCategory[]; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { success: true, data: (data ?? []) as TransactionWithCategory[] }
  } catch {
    return { success: false, error: 'Error al cargar transacciones' }
  }
}

export async function getTransactionById(
  id: string,
  userId: string
): Promise<{ success: boolean; data?: TransactionWithCategory; error?: string }> {
  if (!id || !userId) return { success: false, error: 'Parámetros requeridos' }
  try {
    const { data, error } = await insforge.database
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Transacción no encontrada' }
    return { success: true, data: data as TransactionWithCategory }
  } catch {
    return { success: false, error: 'Error al cargar transacción' }
  }
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createTransactionSchema.parse(input)
    const { error } = await insforge.database
      .from('transactions')
      .insert([{ ...validated, user_id: userId, source: 'manual' }])
    if (error) throw error

    if (validated.account_id) {
      const rpc = validated.type === 'income' ? 'increment_account_balance' : 'decrement_account_balance'
      const { error: rpcError } = await insforge.database.rpc(rpc, {
        account_id: validated.account_id,
        amount: validated.amount,
      })
      if (rpcError) throw rpcError
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error al crear transacción' }
  }
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionInput
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data: oldTx, error: fetchError } = await insforge.database
      .from('transactions')
      .select('account_id, type, amount')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError

    const validated = updateTransactionSchema.parse(input)
    const { data: transaction, error } = await insforge.database
      .from('transactions')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error

    if (oldTx.account_id) {
      const reverseRpc = oldTx.type === 'expense' ? 'increment_account_balance' : 'decrement_account_balance'
      const { error: rpcError } = await insforge.database.rpc(reverseRpc, {
        account_id: oldTx.account_id,
        amount: Number(oldTx.amount),
      })
      if (rpcError) throw rpcError
    }
    if (transaction.account_id) {
      const applyRpc = transaction.type === 'income' ? 'increment_account_balance' : 'decrement_account_balance'
      const { error: rpcError } = await insforge.database.rpc(applyRpc, {
        account_id: transaction.account_id,
        amount: Number(transaction.amount),
      })
      if (rpcError) throw rpcError
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error al actualizar transacción' }
  }
}

export async function deleteTransaction(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data: tx } = await insforge.database
      .from('transactions')
      .select('account_id, type, amount')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!tx) return { success: false, error: 'Transacción no encontrada' }

    const { error } = await insforge.database
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error

    if (tx.account_id) {
      const reverseRpc = tx.type === 'expense' ? 'increment_account_balance' : 'decrement_account_balance'
      const { error: rpcError } = await insforge.database.rpc(reverseRpc, {
        account_id: tx.account_id,
        amount: Number(tx.amount),
      })
      if (rpcError) throw rpcError
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar transacción' }
  }
}
