import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/actions/transactions.actions'
import { getCategories } from '@/lib/actions/categories.actions'
import { getAccounts } from '@/lib/actions/accounts.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import type { Category, Account } from '@/types/database.types'

const CURRENCY_OPTIONS = [
  { label: 'COP - Peso Colombiano', value: 'COP' },
  { label: 'USD - Dólar', value: 'USD' },
  { label: 'VES - Bolívar (Bs)', value: 'VES' },
]

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([getCategories(user.id), getAccounts(user.id)]).then(
      ([catsRes, accsRes]) => {
        if (catsRes.success && catsRes.data) setCategories(catsRes.data)
        if (accsRes.success && accsRes.data) setAccounts(accsRes.data)
      }
    )
    if (!isNew) {
      getTransactionById(id, user.id).then((res) => {
        if (res.success && res.data) {
          const tx = res.data
          setDescription(tx.description)
          setAmount(String(tx.amount))
          setCurrency(tx.currency)
          setType(tx.type)
          setCategoryId(tx.category_id)
          setAccountId(tx.account_id ?? '')
          setDate(tx.date)
          setNotes(tx.notes ?? '')
        }
        setInitialLoading(false)
      })
    }
  }, [user, id, isNew])

  async function handleSubmit() {
    if (!user || !description.trim() || !amount || !categoryId || !date) {
      Alert.alert('Error', 'Completa todos los campos requeridos')
      return
    }
    setSaving(true)
    const data = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency: currency as 'COP' | 'USD' | 'VES',
      type,
      category_id: categoryId,
      account_id: accountId || null,
      date,
      notes: notes.trim() || undefined,
    }
    const result = isNew
      ? await createTransaction(user.id, data)
      : await updateTransaction(id, user.id, data)

    if (result.success) {
      router.back()
    } else {
      Alert.alert('Error', result.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  function handleDelete() {
    if (!user || isNew) return
    Alert.alert('Eliminar transacción', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(id, user.id)
          router.back()
        },
      },
    ])
  }

  const filteredCategories = categories.filter((c) => c.type === type)
  const categoryOptions = filteredCategories.map((c) => ({
    label: `${c.icon ?? ''} ${c.name}`.trim(),
    value: c.id,
  }))
  const accountOptions = [
    { label: 'Sin cuenta', value: '' },
    ...accounts.map((a) => ({
      label: `${a.icon ?? '💳'} ${a.name} (${a.currency})`,
      value: a.id,
    })),
  ]
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const selectedAccount = accounts.find((a) => a.id === accountId)

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
          {isNew ? 'Nueva Transacción' : 'Editar Transacción'}
        </Text>
        {!isNew ? (
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
            <Text className="text-red-400 text-sm">Eliminar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo: Ingreso / Gasto */}
        <View className="flex-row gap-2 mb-4">
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setType(t); setCategoryId('') }}
              activeOpacity={0.7}
              className={`flex-1 py-3 rounded-xl items-center border ${
                type === t ? 'bg-primary border-primary' : 'bg-transparent border-border'
              }`}
            >
              <Text className="text-white font-medium">
                {t === 'expense' ? '🔴 Gasto' : '💚 Ingreso'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormInput
          label="Descripción *"
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Mercado del mes"
        />

        <FormInput
          label="Monto *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
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
                ? `${selectedCategory.icon ?? ''} ${selectedCategory.name}`.trim()
                : 'Seleccionar categoría...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cuenta */}
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
        </View>

        <FormInput
          label="Fecha *"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />

        <FormInput
          label="Notas (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas adicionales..."
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <PrimaryButton
          onPress={handleSubmit}
          loading={saving}
          disabled={!description.trim() || !amount || !categoryId || !date}
        >
          {isNew ? 'Crear Transacción' : 'Guardar Cambios'}
        </PrimaryButton>
      </ScrollView>

      <SelectModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Seleccionar Moneda"
        options={CURRENCY_OPTIONS}
        selected={currency}
        onSelect={(v) => { setCurrency(v); setShowCurrencyPicker(false) }}
      />
      <SelectModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Seleccionar Categoría"
        options={categoryOptions}
        selected={categoryId}
        onSelect={(v) => { setCategoryId(v); setShowCategoryPicker(false) }}
      />
      <SelectModal
        visible={showAccountPicker}
        onClose={() => setShowAccountPicker(false)}
        title="Seleccionar Cuenta"
        options={accountOptions}
        selected={accountId}
        onSelect={(v) => { setAccountId(v); setShowAccountPicker(false) }}
      />
    </SafeAreaView>
  )
}
