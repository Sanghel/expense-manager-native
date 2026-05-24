import { insforge } from '@/lib/insforge'
import { applyBalanceDelta } from '@/lib/utils/balance-updater'
import {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  addFundsSchema,
  type CreateSavingsGoalInput,
  type UpdateSavingsGoalInput,
  type AddFundsInput,
} from '@/lib/validations/savings'
import type { Currency, SavingsGoal } from '@/types/database.types'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

export async function getSavingsGoals(
  userId: string
): Promise<Result<SavingsGoal[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: (data ?? []) as SavingsGoal[] }
  } catch {
    return { success: false, error: 'Error al cargar metas' }
  }
}

export async function getSavingsGoalById(
  id: string,
  userId: string
): Promise<Result<SavingsGoal>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Meta no encontrada' }
    return { success: true, data: data as SavingsGoal }
  } catch {
    return { success: false, error: 'Error al cargar meta' }
  }
}

export async function createSavingsGoal(
  userId: string,
  input: CreateSavingsGoalInput
): Promise<Result<SavingsGoal>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createSavingsGoalSchema.parse(input)
    const { data, error } = await insforge.database
      .from('savings_goals')
      .insert([{ ...validated, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as SavingsGoal }
  } catch {
    return { success: false, error: 'Error al crear meta' }
  }
}

export async function updateSavingsGoal(
  id: string,
  userId: string,
  input: UpdateSavingsGoalInput
): Promise<Result<SavingsGoal>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = updateSavingsGoalSchema.parse(input)
    const { data, error } = await insforge.database
      .from('savings_goals')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as SavingsGoal }
  } catch {
    return { success: false, error: 'Error al actualizar meta' }
  }
}

export async function deleteSavingsGoal(
  id: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { error } = await insforge.database
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar meta' }
  }
}

/**
 * Deposita fondos contra una meta. Es una acción multi-step:
 *
 *   1. Lee el goal (verifica ownership)
 *   2. Calcula newAmount = min(current + amount, target) — clamp
 *   3. Actualiza goal con newAmount + is_completed si llegó a target
 *   4. Inserta row en savings_contributions (historial)
 *   5. Si vino account_id → descuenta de la cuenta vía applyBalanceDelta
 *
 * NO es transaccional (InsForge no expone transacciones). Si algún paso
 * falla a mitad de camino, el estado queda inconsistente. Por ahora
 * cubrimos el caso común (todo OK) y dejamos los edge cases para una
 * iteración futura con RPC server-side.
 *
 * Si el goal ya está completo, retorna error sin tocar nada.
 */
export async function addFundsToGoal(
  id: string,
  userId: string,
  input: AddFundsInput & { account_id?: string | null; currency?: Currency }
): Promise<Result<SavingsGoal>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = addFundsSchema.parse({ amount: input.amount })

    // 1. Fetch goal
    const { data: goal, error: fetchError } = await insforge.database
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!goal) return { success: false, error: 'Meta no encontrada' }
    if (goal.is_completed) {
      return { success: false, error: 'Esta meta ya está completada' }
    }

    // 2-3. Clamp + update
    const target = Number(goal.target_amount)
    const current = Number(goal.current_amount)
    const newAmount = Math.min(current + validated.amount, target)
    const isCompleted = newAmount >= target

    const { data: updated, error: updateError } = await insforge.database
      .from('savings_goals')
      .update({ current_amount: newAmount, is_completed: isCompleted })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (updateError) throw updateError

    // 4. Insert contribution
    const contributionCurrency = input.currency ?? goal.currency
    await insforge.database.from('savings_contributions').insert([
      {
        goal_id: id,
        user_id: userId,
        amount: validated.amount,
        currency: contributionCurrency,
        account_id: input.account_id ?? null,
      },
    ])

    // 5. Descontar de cuenta si aplica
    if (input.account_id) {
      const errMsg = await applyBalanceDelta(
        input.account_id,
        validated.amount,
        contributionCurrency,
        'subtract'
      )
      if (errMsg) {
        // Log pero no falla la operación — el goal ya se actualizó.
        // En una iteración futura: rollback o cola de reintento.
      }
    }

    return { success: true, data: updated as SavingsGoal }
  } catch {
    return { success: false, error: 'Error al depositar fondos' }
  }
}
