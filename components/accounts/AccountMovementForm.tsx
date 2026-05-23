import { View, Text, Alert } from 'react-native'
import { useState } from 'react'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { createAccountMovement } from '@/lib/actions/account_movements.actions'
import type { Account, Currency } from '@/types/database.types'

const CURRENCY_OPTIONS = [
  { label: 'COP - Peso Colombiano', value: 'COP' },
  { label: 'USD - Dólar', value: 'USD' },
  { label: 'VES - Bolívar (Bs)', value: 'VES' },
]

interface Props {
  userId: string
  accounts: Account[]
  onSuccess: () => void
}

const initialForm = {
  from_account_id: '',
  from_amount: '',
  from_currency: 'COP' as Currency,
  to_account_id: '',
  to_amount: '',
  to_currency: 'COP' as Currency,
  description: '',
  date: new Date().toISOString().split('T')[0],
}

export function AccountMovementForm({ userId, accounts, onSuccess }: Props) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [showFromCurrency, setShowFromCurrency] = useState(false)
  const [showToCurrency, setShowToCurrency] = useState(false)
  const [showFromAccount, setShowFromAccount] = useState(false)
  const [showToAccount, setShowToAccount] = useState(false)

  const accountOptions = accounts.map((a) => ({
    label: `${a.icon ?? '💳'} ${a.name} (${a.currency})`,
    value: a.id,
  }))
  const toAccountOptions = accountOptions.filter((o) => o.value !== form.from_account_id)

  const fromAccount = accounts.find((a) => a.id === form.from_account_id)
  const toAccount = accounts.find((a) => a.id === form.to_account_id)

  async function handleSubmit() {
    if (!form.from_account_id || !form.to_account_id || !form.from_amount || !form.to_amount) {
      Alert.alert('Error', 'Completa todos los campos requeridos')
      return
    }
    setSaving(true)
    const result = await createAccountMovement(userId, {
      from_account_id: form.from_account_id,
      from_amount: parseFloat(form.from_amount),
      from_currency: form.from_currency,
      to_account_id: form.to_account_id,
      to_amount: parseFloat(form.to_amount),
      to_currency: form.to_currency,
      description: form.description || null,
      date: form.date,
    })
    if (result.success) {
      setForm(initialForm)
      onSuccess()
      return
    }
    Alert.alert('Error', result.error ?? 'Error al registrar movimiento')
    setSaving(false)
  }

  return (
    <View>
      {/* Cuenta origen */}
      <View className="mb-4">
        <Text className="text-muted text-sm mb-1">Cuenta origen *</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <View
              onTouchEnd={() => setShowFromAccount(true)}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className={fromAccount ? 'text-white' : 'text-muted'}>
                {fromAccount ? `${fromAccount.icon ?? '💳'} ${fromAccount.name}` : 'Seleccionar...'}
              </Text>
            </View>
          </View>
          <View
            onTouchEnd={() => setShowFromCurrency(true)}
            className="bg-surface border border-border rounded-xl px-3 py-3 justify-center"
          >
            <Text className="text-white font-medium">{form.from_currency}</Text>
          </View>
        </View>
      </View>

      <FormInput
        label="Monto enviado *"
        value={form.from_amount}
        onChangeText={(v) => setForm((f) => ({ ...f, from_amount: v }))}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      {/* Cuenta destino */}
      <View className="mb-4">
        <Text className="text-muted text-sm mb-1">Cuenta destino *</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <View
              onTouchEnd={() => setShowToAccount(true)}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className={toAccount ? 'text-white' : 'text-muted'}>
                {toAccount ? `${toAccount.icon ?? '💳'} ${toAccount.name}` : 'Seleccionar...'}
              </Text>
            </View>
          </View>
          <View
            onTouchEnd={() => setShowToCurrency(true)}
            className="bg-surface border border-border rounded-xl px-3 py-3 justify-center"
          >
            <Text className="text-white font-medium">{form.to_currency}</Text>
          </View>
        </View>
      </View>

      <FormInput
        label="Monto recibido *"
        value={form.to_amount}
        onChangeText={(v) => setForm((f) => ({ ...f, to_amount: v }))}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      <FormInput
        label="Descripción (opcional)"
        value={form.description}
        onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
        placeholder="Ej: Cambio de dólares"
      />

      <FormInput
        label="Fecha *"
        value={form.date}
        onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
        placeholder="YYYY-MM-DD"
        keyboardType="numeric"
      />

      <PrimaryButton
        onPress={handleSubmit}
        loading={saving}
        disabled={!form.from_account_id || !form.to_account_id || !form.from_amount || !form.to_amount}
      >
        Registrar Movimiento
      </PrimaryButton>

      <SelectModal
        visible={showFromAccount}
        onClose={() => setShowFromAccount(false)}
        title="Cuenta origen"
        options={accountOptions}
        selected={form.from_account_id}
        onSelect={(v) => {
          setForm((f) => ({
            ...f,
            from_account_id: v,
            to_account_id: f.to_account_id === v ? '' : f.to_account_id,
          }))
          setShowFromAccount(false)
        }}
      />
      <SelectModal
        visible={showToAccount}
        onClose={() => setShowToAccount(false)}
        title="Cuenta destino"
        options={toAccountOptions}
        selected={form.to_account_id}
        onSelect={(v) => { setForm((f) => ({ ...f, to_account_id: v })); setShowToAccount(false) }}
      />
      <SelectModal
        visible={showFromCurrency}
        onClose={() => setShowFromCurrency(false)}
        title="Moneda enviada"
        options={CURRENCY_OPTIONS}
        selected={form.from_currency}
        onSelect={(v) => { setForm((f) => ({ ...f, from_currency: v as Currency })); setShowFromCurrency(false) }}
      />
      <SelectModal
        visible={showToCurrency}
        onClose={() => setShowToCurrency(false)}
        title="Moneda recibida"
        options={CURRENCY_OPTIONS}
        selected={form.to_currency}
        onSelect={(v) => { setForm((f) => ({ ...f, to_currency: v as Currency })); setShowToCurrency(false) }}
      />
    </View>
  )
}
