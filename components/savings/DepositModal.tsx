import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { toast } from '@/components/ui/Toast'
import type { Account, Currency, SavingsGoal } from '@/types/database.types'

interface DepositModalProps {
  visible: boolean
  onClose: () => void
  goal: SavingsGoal
  accounts: Account[]
  /** Llamado con (amount, accountId|null) cuando el user confirma. */
  onSubmit: (input: {
    amount: number
    account_id: string | null
    currency: Currency
  }) => Promise<void>
}

/**
 * Modal de depósito a una meta. Reusa FormDialog (modal full-screen),
 * con un mini-form: monto + cuenta opcional.
 *
 * La currency se infiere de la cuenta seleccionada (o de la meta si no hay
 * cuenta). El llamante recibe ambos en onSubmit.
 */
export function DepositModal({
  visible,
  onClose,
  goal,
  accounts,
  onSubmit,
}: DepositModalProps) {
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Resetear al cerrar/abrir
  useEffect(() => {
    if (!visible) {
      setAmount('')
      setAccountId('')
      setSubmitting(false)
    }
  }, [visible])

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null
  const currency: Currency = selectedAccount?.currency ?? goal.currency

  const remaining = Math.max(
    0,
    Number(goal.target_amount) - Number(goal.current_amount)
  )

  async function handleConfirm() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        amount: parsed,
        account_id: accountId || null,
        currency,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const accountOptions = [
    { label: 'Sin cuenta (solo registrar)', value: '' },
    ...accounts.map((a) => ({
      label: `${a.icon ?? '💳'} ${a.name} (${a.currency})`,
      value: a.id,
    })),
  ]

  return (
    <FormDialog
      visible={visible}
      onClose={onClose}
      title={`Depositar en ${goal.name}`}
      footer={
        <PrimaryButton
          onPress={handleConfirm}
          loading={submitting}
          disabled={!amount}
        >
          Depositar
        </PrimaryButton>
      }
    >
      <FormInput
        label="Monto *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <View className="mb-4">
        <Text className="text-muted text-sm mb-1">Desde cuenta (opcional)</Text>
        <TouchableOpacity
          onPress={() => setShowAccountPicker(true)}
          activeOpacity={0.7}
          className="bg-surface border border-border rounded-xl px-4 py-3"
        >
          <Text className="text-white">
            {selectedAccount
              ? `${selectedAccount.icon ?? '💳'} ${selectedAccount.name} (${selectedAccount.currency})`
              : 'Sin cuenta (solo registrar)'}
          </Text>
        </TouchableOpacity>
        <Text className="text-muted text-xs mt-1">
          Si eliges una cuenta, el monto se descuenta de su balance.
        </Text>
      </View>

      <View className="mt-2 px-4 py-3 rounded-xl bg-surface border border-border">
        <Text className="text-muted text-xs">
          Currency:{' '}
          <Text className="text-white text-sm">{currency}</Text>
        </Text>
        <Text className="text-muted text-xs mt-1">
          Restante para completar:{' '}
          <Text className="text-white text-sm">
            {remaining.toLocaleString()} {goal.currency}
          </Text>
        </Text>
      </View>

      <SelectModal
        visible={showAccountPicker}
        onClose={() => setShowAccountPicker(false)}
        title="Cuenta"
        options={accountOptions}
        selected={accountId}
        onSelect={(v) => {
          setAccountId(v)
          setShowAccountPicker(false)
        }}
      />
    </FormDialog>
  )
}
