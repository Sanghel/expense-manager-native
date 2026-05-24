import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getSavingsGoalById,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addFundsToGoal,
} from '@/lib/actions/savings.actions'
import { getAccounts } from '@/lib/actions/accounts.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { DateInput } from '@/components/ui/DateInput'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import { DepositModal } from '@/components/savings/DepositModal'
import { formatCurrency } from '@/lib/utils/currency'
import type { Account, Currency, SavingsGoal } from '@/types/database.types'

const CURRENCY_OPTIONS = [
  { label: 'COP — Peso Colombiano', value: 'COP' },
  { label: 'USD — Dólar', value: 'USD' },
  { label: 'VES — Bolívar (Bs)', value: 'VES' },
]

export default function SavingsGoalFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [goal, setGoal] = useState<SavingsGoal | null>(null)

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(
    user?.preferred_currency ?? 'COP'
  )
  const [deadline, setDeadline] = useState<string>('')

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    getAccounts(user.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setAccounts(res.data)
    })

    if (!isNew) {
      getSavingsGoalById(id, user.id).then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const g = res.data
          setGoal(g)
          setName(g.name)
          setTargetAmount(String(g.target_amount))
          setCurrency(g.currency)
          setDeadline(g.deadline ?? '')
        } else {
          toast.error(res.error ?? 'Meta no encontrada')
          router.back()
        }
        setInitialLoading(false)
      })
    }

    return () => {
      cancelled = true
    }
  }, [user, id, isNew])

  async function handleSubmit() {
    if (!user) return
    const parsed = parseFloat(targetAmount)
    if (!name.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error('Completa los campos requeridos')
      return
    }

    setSaving(true)
    const input = {
      name: name.trim(),
      target_amount: parsed,
      currency,
      deadline: deadline || null,
    }
    const result = isNew
      ? await createSavingsGoal(user.id, input)
      : await updateSavingsGoal(id, user.id, input)
    setSaving(false)

    if (result.success) {
      toast.success(isNew ? 'Meta creada' : 'Meta actualizada')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
  }

  async function handleDelete() {
    if (!user || isNew) return
    const ok = await confirmDialog({
      title: 'Eliminar meta',
      message: 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    setSaving(true)
    const result = await deleteSavingsGoal(id, user.id)
    setSaving(false)
    if (result.success) {
      toast.success('Meta eliminada')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  async function handleDeposit(input: {
    amount: number
    account_id: string | null
    currency: Currency
  }) {
    if (!user || !goal) return
    const result = await addFundsToGoal(goal.id, user.id, {
      amount: input.amount,
      account_id: input.account_id,
      currency: input.currency,
    })
    if (result.success && result.data) {
      setGoal(result.data)
      setShowDepositModal(false)
      if (result.data.is_completed) {
        toast.success('¡Meta completada! 🎉')
      } else {
        toast.success('Depósito registrado')
      }
    } else {
      toast.error(result.error ?? 'Error al depositar')
    }
  }

  if (initialLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  // Progreso visible (solo cuando editando)
  const target = goal ? Number(goal.target_amount) : 0
  const current = goal ? Number(goal.current_amount) : 0
  const ratio = target > 0 ? current / target : 0
  const completed = goal?.is_completed || ratio >= 1

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">
          {isNew ? 'Nueva meta' : 'Editar meta'}
        </Text>
        {!isNew ? (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-sm">Eliminar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Resumen si edit */}
          {goal ? (
            <View className="mb-6 bg-surface border border-border rounded-2xl p-4">
              <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                Progreso
              </Text>
              <ProgressBar value={ratio} color="#10b981" />
              <View className="flex-row justify-between mt-3">
                <Text className="text-muted text-xs">
                  {formatCurrency(current, goal.currency)} de{' '}
                  {formatCurrency(target, goal.currency)}
                </Text>
                <Text className="text-green-400 text-sm font-semibold">
                  {Math.round(ratio * 100)}%
                </Text>
              </View>

              <View className="mt-4">
                <PrimaryButton
                  onPress={() => setShowDepositModal(true)}
                  disabled={completed}
                >
                  {completed ? 'Meta completada' : 'Depositar fondos'}
                </PrimaryButton>
              </View>
            </View>
          ) : null}

          {/* Form fields */}
          <FormInput
            label="Nombre *"
            value={name}
            onChangeText={setName}
            placeholder="Ej: Viaje a Japón"
          />

          <FormInput
            label="Monto objetivo *"
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Moneda</Text>
            <TouchableOpacity
              onPress={() => setShowCurrencyPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className="text-white">
                {CURRENCY_OPTIONS.find((o) => o.value === currency)?.label ??
                  currency}
              </Text>
            </TouchableOpacity>
          </View>

          <DateInput
            label="Fecha límite (opcional)"
            value={deadline}
            onChange={setDeadline}
            placeholder="Sin fecha límite"
          />

          <PrimaryButton
            onPress={handleSubmit}
            loading={saving}
            disabled={!name.trim() || !targetAmount}
          >
            {isNew ? 'Crear meta' : 'Guardar cambios'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Moneda"
        options={CURRENCY_OPTIONS}
        selected={currency}
        onSelect={(v) => {
          setCurrency(v as Currency)
          setShowCurrencyPicker(false)
        }}
      />

      {goal ? (
        <DepositModal
          visible={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          goal={goal}
          accounts={accounts}
          onSubmit={handleDeposit}
        />
      ) : null}
    </SafeAreaView>
  )
}
