import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormInput } from '@/components/ui/FormInput'
import { DateInput } from '@/components/ui/DateInput'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { toast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils/currency'
import type { Currency, LoanWithAccount } from '@/types/database.types'

interface PaymentModalProps {
  visible: boolean
  onClose: () => void
  loan: LoanWithAccount
  onSubmit: (input: {
    amount: number
    date: string
    notes: string | null
    currency: Currency
  }) => Promise<void>
}

/**
 * Modal para registrar un pago contra un préstamo. La currency se hereda
 * del préstamo (no se puede pagar en otra moneda — al menos por ahora).
 */
export function PaymentModal({
  visible,
  onClose,
  loan,
  onSubmit,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) {
      setAmount('')
      setDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setSubmitting(false)
    }
  }, [visible])

  const remaining = Math.max(
    0,
    Number(loan.amount) - Number(loan.paid_amount)
  )

  async function handleConfirm() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    if (parsed > remaining) {
      toast.error(`El pago no puede exceder el saldo: ${formatCurrency(remaining, loan.currency)}`)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        amount: parsed,
        date,
        notes: notes.trim() || null,
        currency: loan.currency,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isLent = loan.type === 'lent'

  return (
    <FormDialog
      visible={visible}
      onClose={onClose}
      title={isLent ? 'Registrar cobro' : 'Registrar pago'}
      footer={
        <PrimaryButton
          onPress={handleConfirm}
          loading={submitting}
          disabled={!amount}
        >
          {isLent ? 'Confirmar cobro' : 'Confirmar pago'}
        </PrimaryButton>
      }
    >
      <View className="mb-4 px-4 py-3 rounded-xl bg-surface border border-border">
        <Text className="text-muted text-xs">
          {isLent
            ? `Cobro a ${loan.person_name}. Saldo pendiente: `
            : `Pago a ${loan.person_name}. Saldo pendiente: `}
          <Text className="text-white text-sm">
            {formatCurrency(remaining, loan.currency)}
          </Text>
        </Text>
        {loan.account ? (
          <Text className="text-muted text-xs mt-1">
            Impactará la cuenta{' '}
            <Text className="text-white text-sm">
              {loan.account.icon ?? '💳'} {loan.account.name}
            </Text>
            : {isLent ? 'entrará' : 'saldrá'} el monto del pago.
          </Text>
        ) : null}
      </View>

      <FormInput
        label="Monto *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <DateInput label="Fecha *" value={date} onChange={setDate} />

      <FormInput
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Ej: Pago primera quincena"
        multiline
        numberOfLines={2}
        style={{ minHeight: 60, textAlignVertical: 'top' }}
      />
    </FormDialog>
  )
}
