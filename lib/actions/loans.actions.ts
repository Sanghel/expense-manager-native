import { insforge } from '@/lib/insforge'
import { applyBalanceDelta } from '@/lib/utils/balance-updater'
import {
  createLoanSchema,
  updateLoanSchema,
  createLoanPaymentSchema,
  type CreateLoanInput,
  type UpdateLoanInput,
  type CreateLoanPaymentInput,
} from '@/lib/validations/loan'
import type {
  Loan,
  LoanPayment,
  LoanType,
  LoanWithAccount,
} from '@/types/database.types'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Dirección del delta de balance según el tipo de préstamo y la operación.
 *
 *                | create | payment | reverse
 *   -------------+--------+---------+---------
 *   lent         |  -     |   +     |   +     (presté → me devuelven → reverso: vuelve el "salió")
 *   borrowed     |  +     |   -     |   -     (me prestaron → devuelvo → reverso: vuelve el "entró")
 *
 * "reverse" se usa al editar/borrar para revertir el efecto original del create.
 */
type BalanceOp = 'create' | 'payment' | 'reverse'
function balanceDirection(
  type: LoanType,
  op: BalanceOp
): 'add' | 'subtract' {
  if (type === 'lent') {
    return op === 'create' ? 'subtract' : 'add'
  }
  // borrowed
  return op === 'create' ? 'add' : 'subtract'
}

export async function getLoans(
  userId: string
): Promise<Result<LoanWithAccount[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('loans')
      .select('*, account:accounts(id, name, currency, icon)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: (data ?? []) as LoanWithAccount[] }
  } catch {
    return { success: false, error: 'Error al cargar préstamos' }
  }
}

export async function getLoanById(
  id: string,
  userId: string
): Promise<Result<LoanWithAccount>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('loans')
      .select('*, account:accounts(id, name, currency, icon)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Préstamo no encontrado' }
    return { success: true, data: data as LoanWithAccount }
  } catch {
    return { success: false, error: 'Error al cargar préstamo' }
  }
}

export async function getLoanPayments(
  loanId: string,
  userId: string
): Promise<Result<LoanPayment[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
    if (error) throw error
    return { success: true, data: (data ?? []) as LoanPayment[] }
  } catch {
    return { success: false, error: 'Error al cargar pagos' }
  }
}

export async function createLoan(
  userId: string,
  input: CreateLoanInput
): Promise<Result<Loan>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createLoanSchema.parse(input)
    const { data, error } = await insforge.database
      .from('loans')
      .insert([{ ...validated, user_id: userId }])
      .select()
      .single()
    if (error) throw error

    if (validated.account_id) {
      await applyBalanceDelta(
        validated.account_id,
        validated.amount,
        validated.currency,
        balanceDirection(validated.type, 'create')
      )
    }
    return { success: true, data: data as Loan }
  } catch {
    return { success: false, error: 'Error al crear préstamo' }
  }
}

export async function updateLoan(
  id: string,
  userId: string,
  input: UpdateLoanInput
): Promise<Result<Loan>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = updateLoanSchema.parse(input)

    const { data: old, error: fetchError } = await insforge.database
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!old) return { success: false, error: 'Préstamo no encontrado' }
    if (old.status === 'settled') {
      return {
        success: false,
        error: 'No se puede editar un préstamo saldado',
      }
    }

    // Revertir balance del estado anterior
    if (old.account_id) {
      await applyBalanceDelta(
        old.account_id,
        Number(old.amount),
        old.currency,
        balanceDirection(old.type as LoanType, 'reverse')
      )
    }

    // Aplicar balance del nuevo estado
    const next = {
      person_name: validated.person_name ?? old.person_name,
      amount: validated.amount ?? Number(old.amount),
      currency: validated.currency ?? old.currency,
      account_id: validated.account_id ?? old.account_id,
      type: validated.type ?? (old.type as LoanType),
      notes: validated.notes ?? old.notes,
    }
    if (next.account_id) {
      await applyBalanceDelta(
        next.account_id,
        next.amount,
        next.currency,
        balanceDirection(next.type, 'create')
      )
    }

    const { data, error } = await insforge.database
      .from('loans')
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as Loan }
  } catch {
    return { success: false, error: 'Error al actualizar préstamo' }
  }
}

export async function deleteLoan(
  id: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data: loan, error: fetchError } = await insforge.database
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!loan) return { success: false, error: 'Préstamo no encontrado' }

    // Solo revertir si está activo (settled ya cuadró todos los pagos)
    if (loan.status === 'active' && loan.account_id) {
      await applyBalanceDelta(
        loan.account_id,
        Number(loan.amount),
        loan.currency,
        balanceDirection(loan.type as LoanType, 'reverse')
      )
    }

    const { error } = await insforge.database
      .from('loans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar préstamo' }
  }
}

/**
 * Registra un pago contra un préstamo. Multi-step similar a addFundsToGoal:
 *
 *   1. Fetch loan + verifica que no esté saldado
 *   2. Impactar balance (lent → suma, borrowed → resta)
 *   3. Insert payment row
 *   4. Update loan.paid_amount; si paid >= amount → status='settled' + settled_at
 *
 * Ver [[Acciones multi-step sin transacciones]] para garantías.
 */
export async function addLoanPayment(
  loanId: string,
  userId: string,
  input: CreateLoanPaymentInput
): Promise<Result<{ loan: Loan; settled: boolean }>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createLoanPaymentSchema.parse(input)

    const { data: loan, error: fetchError } = await insforge.database
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!loan) return { success: false, error: 'Préstamo no encontrado' }
    if (loan.status === 'settled') {
      return { success: false, error: 'El préstamo ya está saldado' }
    }

    // Impactar balance
    if (loan.account_id) {
      await applyBalanceDelta(
        loan.account_id,
        validated.amount,
        validated.currency,
        balanceDirection(loan.type as LoanType, 'payment')
      )
    }

    // Insert payment
    await insforge.database.from('loan_payments').insert([
      {
        loan_id: loanId,
        user_id: userId,
        amount: validated.amount,
        currency: validated.currency,
        date: validated.date,
        notes: validated.notes ?? null,
      },
    ])

    // Update loan totals
    const currentPaid = Number(loan.paid_amount ?? 0)
    const loanAmount = Number(loan.amount)
    const newPaid = currentPaid + validated.amount
    const isSettled = newPaid >= loanAmount

    const { data: updated, error: updateError } = await insforge.database
      .from('loans')
      .update({
        paid_amount: isSettled ? loanAmount : newPaid,
        status: isSettled ? 'settled' : 'active',
        ...(isSettled ? { settled_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .eq('user_id', userId)
      .select()
      .single()
    if (updateError) throw updateError

    return { success: true, data: { loan: updated as Loan, settled: isSettled } }
  } catch {
    return { success: false, error: 'Error al registrar pago' }
  }
}

export async function deleteLoanPayment(
  paymentId: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    // Fetch payment + loan join
    const { data: payment, error: fetchError } = await insforge.database
      .from('loan_payments')
      .select('*, loan:loans(*)')
      .eq('id', paymentId)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!payment) return { success: false, error: 'Pago no encontrado' }

    const loan = (payment as { loan: Loan }).loan
    if (!loan) return { success: false, error: 'Préstamo no encontrado' }

    // Revertir balance del payment
    if (loan.account_id) {
      // El opuesto de 'payment' es 'create' para fines de signo
      await applyBalanceDelta(
        loan.account_id,
        Number(payment.amount),
        payment.currency,
        balanceDirection(loan.type, 'create')
      )
    }

    // Reducir paid_amount, reabrir si estaba settled
    const newPaid = Math.max(
      0,
      Number(loan.paid_amount) - Number(payment.amount)
    )
    await insforge.database
      .from('loans')
      .update({
        paid_amount: newPaid,
        status: 'active',
        settled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan.id)
      .eq('user_id', userId)

    const { error } = await insforge.database
      .from('loan_payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar pago' }
  }
}

/**
 * Liquida el préstamo: crea un pago final por el saldo restante e impacta
 * el balance. Si ya estaba saldado, retorna error.
 */
export async function settleLoan(
  loanId: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data: loan, error: fetchError } = await insforge.database
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    if (!loan) return { success: false, error: 'Préstamo no encontrado' }
    if (loan.status === 'settled') {
      return { success: false, error: 'Ya está saldado' }
    }

    const remaining = Number(loan.amount) - Number(loan.paid_amount ?? 0)

    if (loan.account_id && remaining > 0) {
      await applyBalanceDelta(
        loan.account_id,
        remaining,
        loan.currency,
        balanceDirection(loan.type as LoanType, 'payment')
      )
    }

    if (remaining > 0) {
      await insforge.database.from('loan_payments').insert([
        {
          loan_id: loanId,
          user_id: userId,
          amount: remaining,
          currency: loan.currency,
          date: new Date().toISOString().slice(0, 10),
          notes: 'Saldo final',
        },
      ])
    }

    const { error } = await insforge.database
      .from('loans')
      .update({
        paid_amount: Number(loan.amount),
        status: 'settled',
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .eq('user_id', userId)
    if (error) throw error

    return { success: true }
  } catch {
    return { success: false, error: 'Error al saldar préstamo' }
  }
}
