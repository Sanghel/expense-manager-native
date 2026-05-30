import { insforge } from '@/lib/insforge'
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/lib/validations/transaction'
import type { TransactionWithCategory, TransactionType } from '@/types/database.types'

export interface GetTransactionsFilters {
  search?: string
  type?: TransactionType | 'all'
  categoryId?: string | null
  accountId?: string | null
  /** Formato 'YYYY-MM'. Si presente, filtra al mes calendar exacto. */
  month?: string | null
}

export interface GetTransactionsPagination {
  page?: number
  pageSize?: number
}

export interface GetTransactionsResult {
  items: TransactionWithCategory[]
  hasMore: boolean
}

/**
 * Lista transacciones del user con filtros y paginación server-side.
 * Sin params, devuelve la primera página de 20 ordenadas por fecha descendente.
 *
 * `hasMore` se determina pidiendo `pageSize + 1` rows y chequeando si llegan
 * más de las esperadas. Si sí, devolvemos solo `pageSize` y marcamos hasMore.
 */
export async function getTransactions(
  userId: string,
  filters: GetTransactionsFilters = {},
  pagination: GetTransactionsPagination = {}
): Promise<{ success: boolean; data?: GetTransactionsResult; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }

  const { search, type, categoryId, accountId, month } = filters
  const { page = 1, pageSize = 20 } = pagination

  try {
    let query = insforge.database
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', userId)

    if (search && search.trim()) {
      query = query.ilike('description', `%${search.trim()}%`)
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (month) {
      const [year, mo] = month.split('-').map(Number)
      const start = new Date(year, mo - 1, 1)
      const end = new Date(year, mo, 1)
      const startDate = start.toISOString().slice(0, 10)
      const endDate = end.toISOString().slice(0, 10)
      query = query.gte('date', startDate).lt('date', endDate)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize // pedimos 1 extra para detectar hasMore

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error

    const rows = (data ?? []) as TransactionWithCategory[]
    const hasMore = rows.length > pageSize
    const items = hasMore ? rows.slice(0, pageSize) : rows

    return { success: true, data: { items, hasMore } }
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
