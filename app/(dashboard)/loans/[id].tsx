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
  getLoanById,
  getLoanPayments,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanPayment,
  deleteLoanPayment,
  settleLoan,
} from '@/lib/actions/loans.actions'
import { getAccounts } from '@/lib/actions/accounts.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { PaymentModal } from '@/components/loans/PaymentModal'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  Account,
  Currency,
  LoanPayment,
  LoanType,
  LoanWithAccount,
} from '@/types/database.types'

const CURRENCY_OPTIONS = [
  { label: 'COP — Peso Colombiano', value: 'COP' },
  { label: 'USD — Dólar', value: 'USD' },
  { label: 'VES — Bolívar (Bs)', value: 'VES' },
]

const TYPE_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'lent', label: 'Le presté' },
  { value: 'borrowed', label: 'Me prestó' },
]

function formatPaymentDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function LoanFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loan, setLoan] = useState<LoanWithAccount | null>(null)
  const [payments, setPayments] = useState<LoanPayment[]>([])

  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(
    user?.preferred_currency ?? 'COP'
  )
  const [type, setType] = useState<LoanType>('lent')
  const [accountId, setAccountId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    getAccounts(user.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setAccounts(res.data)
    })

    if (!isNew) {
      Promise.all([
        getLoanById(id, user.id),
        getLoanPayments(id, user.id),
      ]).then(([loanRes, paymentsRes]) => {
        if (cancelled) return
        if (loanRes.success && loanRes.data) {
          const l = loanRes.data
          setLoan(l)
          setPersonName(l.person_name)
          setAmount(String(l.amount))
          setCurrency(l.currency)
          setType(l.type)
          setAccountId(l.account_id ?? '')
          setNotes(l.notes ?? '')
        } else {
          toast.error(loanRes.error ?? 'Préstamo no encontrado')
          router.back()
        }
        if (paymentsRes.success && paymentsRes.data) {
          setPayments(paymentsRes.data)
        }
        setInitialLoading(false)
      })
    }

    return () => {
      cancelled = true
    }
  }, [user, id, isNew])

  async function refreshLoanAndPayments() {
    if (!user || isNew) return
    const [loanRes, paymentsRes] = await Promise.all([
      getLoanById(id, user.id),
      getLoanPayments(id, user.id),
    ])
    if (loanRes.success && loanRes.data) setLoan(loanRes.data)
    if (paymentsRes.success && paymentsRes.data) setPayments(paymentsRes.data)
  }

  async function handleSubmit() {
    if (!user) return
    const parsed = parseFloat(amount)
    if (!personName.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error('Completa los campos requeridos')
      return
    }

    setSaving(true)
    const input = {
      person_name: personName.trim(),
      amount: parsed,
      currency,
      account_id: accountId || null,
      type,
      notes: notes.trim() || null,
    }
    const result = isNew
      ? await createLoan(user.id, input)
      : await updateLoan(id, user.id, input)
    setSaving(false)

    if (result.success) {
      toast.success(isNew ? 'Préstamo creado' : 'Préstamo actualizado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
  }

  async function handleDelete() {
    if (!user || isNew) return
    const ok = await confirmDialog({
      title: 'Eliminar préstamo',
      message:
        loan?.status === 'active'
          ? 'Se revertirá el impacto en la cuenta.'
          : 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    setSaving(true)
    const result = await deleteLoan(id, user.id)
    setSaving(false)
    if (result.success) {
      toast.success('Préstamo eliminado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  async function handlePayment(input: {
    amount: number
    date: string
    notes: string | null
    currency: Currency
  }) {
    if (!user || !loan) return
    const result = await addLoanPayment(loan.id, user.id, {
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      notes: input.notes,
    })
    if (result.success && result.data) {
      setShowPaymentModal(false)
      if (result.data.settled) {
        toast.success('¡Préstamo saldado! 🎉')
      } else {
        toast.success(loan.type === 'lent' ? 'Cobro registrado' : 'Pago registrado')
      }
      await refreshLoanAndPayments()
    } else {
      toast.error(result.error ?? 'Error al registrar')
    }
  }

  async function handleDeletePayment(payment: LoanPayment) {
    if (!user) return
    const ok = await confirmDialog({
      title: 'Eliminar pago',
      message: 'Se revertirá el impacto en la cuenta y se reabrirá el préstamo si estaba saldado.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    const result = await deleteLoanPayment(payment.id, user.id)
    if (result.success) {
      toast.success('Pago eliminado')
      await refreshLoanAndPayments()
    } else {
      toast.error(result.error ?? 'Error al eliminar pago')
    }
  }

  async function handleSettleAll() {
    if (!user || !loan) return
    const ok = await confirmDialog({
      title: 'Saldar préstamo',
      message: 'Se creará un pago final por el saldo restante e impactará la cuenta.',
      confirmLabel: 'Saldar',
    })
    if (!ok) return

    const result = await settleLoan(loan.id, user.id)
    if (result.success) {
      toast.success('Préstamo saldado')
      await refreshLoanAndPayments()
    } else {
      toast.error(result.error ?? 'Error al saldar')
    }
  }

  if (initialLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  // Derivados
  const amountNum = loan ? Number(loan.amount) : 0
  const paidNum = loan ? Number(loan.paid_amount) : 0
  const ratio = amountNum > 0 ? paidNum / amountNum : 0
  const settled = loan?.status === 'settled'
  const isLent = type === 'lent'

  const accountOptions = [
    { label: 'Sin cuenta', value: '' },
    ...accounts.map((a) => ({
      label: `${a.icon ?? '💳'} ${a.name} (${a.currency})`,
      value: a.id,
    })),
  ]
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">
          {isNew ? 'Nuevo préstamo' : settled ? 'Préstamo saldado' : 'Editar préstamo'}
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
          {/* Resumen en edit */}
          {loan ? (
            <View className="mb-6 bg-surface border border-border rounded-2xl p-4">
              <View className="flex-row items-center mb-3">
                <Text className="text-muted text-xs uppercase tracking-wider flex-1">
                  Progreso
                </Text>
                {settled ? (
                  <View className="px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40">
                    <Text className="text-green-400 text-xs font-semibold">
                      Saldado
                    </Text>
                  </View>
                ) : null}
              </View>
              <ProgressBar value={ratio} color="#10b981" />
              <View className="flex-row justify-between mt-3">
                <Text className="text-muted text-xs">
                  {loan.type === 'lent' ? 'Cobrado ' : 'Pagado '}
                  <Text className="text-white text-sm">
                    {formatCurrency(paidNum, loan.currency)}
                  </Text>
                </Text>
                <Text className="text-muted text-xs">
                  de{' '}
                  <Text className="text-white text-sm">
                    {formatCurrency(amountNum, loan.currency)}
                  </Text>
                </Text>
              </View>

              {!settled ? (
                <View className="mt-4 gap-2">
                  <PrimaryButton onPress={() => setShowPaymentModal(true)}>
                    {loan.type === 'lent' ? 'Registrar cobro' : 'Registrar pago'}
                  </PrimaryButton>
                  <TouchableOpacity
                    onPress={handleSettleAll}
                    activeOpacity={0.7}
                    className="border border-green-500/60 rounded-xl py-3 items-center"
                  >
                    <Text className="text-green-400 font-semibold">
                      Saldar completo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Pagos en edit */}
          {!isNew && payments.length > 0 ? (
            <View className="mb-6">
              <Text className="text-muted text-xs uppercase tracking-wider mb-2 px-1">
                Historial de pagos ({payments.length})
              </Text>
              <View className="bg-surface border border-border rounded-2xl overflow-hidden">
                {payments.map((p, idx) => (
                  <View
                    key={p.id}
                    className={`flex-row items-center px-4 py-3 ${
                      idx < payments.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-white text-sm font-medium">
                        {formatCurrency(Number(p.amount), p.currency)}
                      </Text>
                      <Text className="text-muted text-xs mt-0.5">
                        {formatPaymentDate(p.date)}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </Text>
                    </View>
                    {!settled ? (
                      <TouchableOpacity
                        onPress={() => handleDeletePayment(p)}
                        activeOpacity={0.6}
                        className="px-2 py-2"
                      >
                        <Icon name="trash" size={16} color="#f87171" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Form fields (deshabilitados si settled) */}
          <View pointerEvents={settled ? 'none' : 'auto'} style={{ opacity: settled ? 0.5 : 1 }}>
            {/* Tipo */}
            <View className="mb-4">
              <Text className="text-muted text-sm mb-1">Tipo</Text>
              <View className="flex-row gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    activeOpacity={0.7}
                    className={`flex-1 py-3 rounded-xl items-center border ${
                      type === opt.value
                        ? 'bg-primary border-primary'
                        : 'bg-transparent border-border'
                    }`}
                  >
                    <Text className="text-white font-medium">{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <FormInput
              label="Persona *"
              value={personName}
              onChangeText={setPersonName}
              placeholder="Ej: Juan"
            />

            <FormInput
              label="Monto *"
              value={amount}
              onChangeText={setAmount}
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
                  {CURRENCY_OPTIONS.find((o) => o.value === currency)?.label ?? currency}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-muted text-sm mb-1">Cuenta (opcional)</Text>
              <TouchableOpacity
                onPress={() => setShowAccountPicker(true)}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl px-4 py-3"
              >
                <Text className="text-white">
                  {selectedAccount
                    ? `${selectedAccount.icon ?? '💳'} ${selectedAccount.name}`
                    : 'Sin cuenta'}
                </Text>
              </TouchableOpacity>
              <Text className="text-muted text-xs mt-1">
                {isLent
                  ? 'Si eliges una cuenta, se descontará al crear y se devolverá al cobrar.'
                  : 'Si eliges una cuenta, se sumará al crear y se descontará al pagar.'}
              </Text>
            </View>

            <FormInput
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas adicionales..."
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />

            {!settled ? (
              <PrimaryButton
                onPress={handleSubmit}
                loading={saving}
                disabled={!personName.trim() || !amount}
              >
                {isNew ? 'Crear préstamo' : 'Guardar cambios'}
              </PrimaryButton>
            ) : null}
          </View>
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

      {loan ? (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          loan={loan}
          onSubmit={handlePayment}
        />
      ) : null}
    </SafeAreaView>
  )
}
