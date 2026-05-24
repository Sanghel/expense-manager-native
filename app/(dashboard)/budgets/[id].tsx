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
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
} from '@/lib/actions/budgets.actions'
import { getCategories } from '@/lib/actions/categories.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { DateInput } from '@/components/ui/DateInput'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import type { BudgetPeriod, Category, Currency } from '@/types/database.types'

const CURRENCY_OPTIONS = [
  { label: 'COP — Peso Colombiano', value: 'COP' },
  { label: 'USD — Dólar', value: 'USD' },
  { label: 'VES — Bolívar (Bs)', value: 'VES' },
]

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
]

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(user?.preferred_currency ?? 'COP')
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [startDate, setStartDate] = useState(todayYMD())

  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  // Cargar categorías + budget si edit
  useEffect(() => {
    if (!user) return
    let cancelled = false

    getCategories(user.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setCategories(res.data)
    })

    if (!isNew) {
      getBudgetById(id, user.id).then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const b = res.data
          setCategoryId(b.category_id)
          setAmount(String(b.amount))
          setCurrency(b.currency)
          setPeriod(b.period)
          setStartDate(b.start_date)
        } else {
          toast.error(res.error ?? 'Presupuesto no encontrado')
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
    const parsed = parseFloat(amount)
    if (!categoryId || !amount || isNaN(parsed) || parsed <= 0) {
      toast.error('Completa todos los campos')
      return
    }

    setSaving(true)
    const input = {
      category_id: categoryId,
      amount: parsed,
      currency,
      period,
      start_date: startDate,
    }
    const result = isNew
      ? await createBudget(user.id, input)
      : await updateBudget(id, user.id, input)
    setSaving(false)

    if (result.success) {
      toast.success(isNew ? 'Presupuesto creado' : 'Presupuesto actualizado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
  }

  async function handleDelete() {
    if (!user || isNew) return
    const ok = await confirmDialog({
      title: 'Eliminar presupuesto',
      message: 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    setSaving(true)
    const result = await deleteBudget(id, user.id)
    setSaving(false)
    if (result.success) {
      toast.success('Presupuesto eliminado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  // Categorías filtradas: solo expense o both (no income — no se presupuesta lo que entra)
  const filteredCategories = categories.filter(
    (c) => c.type === 'expense' || c.type === 'both'
  )
  const categoryOptions = filteredCategories.map((c) => ({
    label: `${c.icon ?? '📂'} ${c.name}`,
    value: c.id,
  }))
  const selectedCategory = categories.find((c) => c.id === categoryId)

  if (initialLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">
          {isNew ? 'Nuevo presupuesto' : 'Editar presupuesto'}
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
          {/* Categoría */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Categoría *</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className={selectedCategory ? 'text-white' : 'text-muted'}>
                {selectedCategory
                  ? `${selectedCategory.icon ?? '📂'} ${selectedCategory.name}`
                  : 'Seleccionar categoría...'}
              </Text>
            </TouchableOpacity>
          </View>

          <FormInput
            label="Monto *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          {/* Moneda */}
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

          {/* Período */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Período</Text>
            <View className="flex-row gap-2">
              {PERIOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPeriod(opt.value)}
                  activeOpacity={0.7}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    period === opt.value
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-border'
                  }`}
                >
                  <Text className="text-white font-medium">{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fecha de inicio */}
          <DateInput
            label="Fecha de inicio *"
            value={startDate}
            onChange={setStartDate}
          />

          <Text className="text-muted text-xs mb-4 leading-relaxed">
            El período {period === 'monthly' ? 'mensual' : 'anual'} se renueva el día{' '}
            {new Date(`${startDate}T00:00:00`).getDate()} de cada{' '}
            {period === 'monthly' ? 'mes' : 'año'}.
          </Text>

          <PrimaryButton
            onPress={handleSubmit}
            loading={saving}
            disabled={!categoryId || !amount}
          >
            {isNew ? 'Crear presupuesto' : 'Guardar cambios'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Categoría"
        options={categoryOptions}
        selected={categoryId}
        onSelect={(v) => {
          setCategoryId(v)
          setShowCategoryPicker(false)
        }}
      />
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
    </SafeAreaView>
  )
}
