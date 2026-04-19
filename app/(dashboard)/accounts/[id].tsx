import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getAccountById, createAccount, updateAccount, deleteAccount, getAccounts,
} from '@/lib/actions/accounts.actions'
import { getAccountMovements, deleteAccountMovement } from '@/lib/actions/account_movements.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal, type SelectOption } from '@/components/ui/SelectModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { AccountMovementForm } from '@/components/accounts/AccountMovementForm'
import { formatCurrency } from '@/lib/utils/currency'
import type { Account, AccountMovementWithAccounts, Currency } from '@/types/database.types'

const CURRENCY_OPTIONS: SelectOption[] = [
  { label: 'COP - Peso Colombiano', value: 'COP' },
  { label: 'USD - Dólar', value: 'USD' },
  { label: 'VES - Bolívar (Bs)', value: 'VES' },
]

const TYPE_OPTIONS: SelectOption[] = [
  { label: '🏦 Banco', value: 'bank' },
  { label: '📱 Digital', value: 'digital' },
  { label: '₿ Crypto', value: 'crypto' },
  { label: '💵 Efectivo', value: 'cash' },
]

export default function AccountFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [movements, setMovements] = useState<AccountMovementWithAccounts[]>([])
  const [showMovementForm, setShowMovementForm] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [currency, setCurrency] = useState<Currency>('COP')
  const [balance, setBalance] = useState('0')
  const [color, setColor] = useState('#4F46E5')
  const [icon, setIcon] = useState('💳')

  const [showTypePicker, setShowTypePicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  const refreshMovements = useCallback(async () => {
    if (!user || isNew) return
    const res = await getAccountMovements(user.id)
    if (res.success && res.data) {
      setMovements(res.data.filter((m) => m.from_account_id === id || m.to_account_id === id))
    }
  }, [user, id, isNew])

  useEffect(() => {
    if (!user) return
    getAccounts(user.id).then((res) => {
      if (res.success && res.data) setAllAccounts(res.data)
    })
    if (!isNew) {
      Promise.all([
        getAccountById(id, user.id),
        getAccountMovements(user.id),
      ]).then(([accRes, movRes]) => {
        if (accRes.success && accRes.data) {
          const a = accRes.data
          setName(a.name)
          setType(a.type)
          setCurrency(a.currency)
          setBalance(String(a.balance))
          setColor(a.color ?? '#4F46E5')
          setIcon(a.icon ?? '💳')
        }
        if (movRes.success && movRes.data) {
          setMovements(movRes.data.filter((m) => m.from_account_id === id || m.to_account_id === id))
        }
        setInitialLoading(false)
      })
    }
  }, [user, id, isNew])

  async function handleSubmit() {
    if (!user || !name.trim()) {
      Alert.alert('Error', 'El nombre es requerido')
      return
    }
    setSaving(true)
    const data = {
      name: name.trim(),
      type: type as 'bank' | 'digital' | 'crypto' | 'cash',
      currency,
      balance: parseFloat(balance) || 0,
      color: color || null,
      icon: icon || null,
    }
    const result = isNew
      ? await createAccount(user.id, data)
      : await updateAccount(id, user.id, data)

    if (result.success) {
      router.back()
      return
    }
    Alert.alert('Error', result.error ?? 'Error al guardar')
    setSaving(false)
  }

  function handleDelete() {
    if (!user || isNew) return
    Alert.alert('Eliminar cuenta', '¿Eliminar esta cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const result = await deleteAccount(id, user.id)
          if (result.success) {
            router.back()
          } else {
            Alert.alert('Error', result.error)
          }
        },
      },
    ])
  }

  async function handleDeleteMovement(movId: string) {
    if (!user) return
    Alert.alert('Eliminar movimiento', '¿Revertir este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const result = await deleteAccountMovement(movId, user.id)
          if (result.success) {
            await refreshMovements()
            // Refresh balance display
            const accRes = await getAccountById(id, user.id)
            if (accRes.success && accRes.data) {
              setBalance(String(accRes.data.balance))
            }
          }
        },
      },
    ])
  }

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
          {isNew ? 'Nueva Cuenta' : name || 'Editar Cuenta'}
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
        {/* Account form fields */}
        <FormInput label="Nombre *" value={name} onChangeText={setName} placeholder="Ej: Bancolombia" />

        <View className="mb-4">
          <Text className="text-muted text-sm mb-1">Tipo</Text>
          <TouchableOpacity onPress={() => setShowTypePicker(true)} activeOpacity={0.7}
            className="bg-surface border border-border rounded-xl px-4 py-3">
            <Text className="text-white">
              {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-muted text-sm mb-1">Moneda</Text>
          <TouchableOpacity onPress={() => setShowCurrencyPicker(true)} activeOpacity={0.7}
            className="bg-surface border border-border rounded-xl px-4 py-3">
            <Text className="text-white">
              {CURRENCY_OPTIONS.find((o) => o.value === currency)?.label ?? currency}
            </Text>
          </TouchableOpacity>
        </View>

        {isNew && (
          <FormInput
            label="Balance inicial"
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        )}

        <FormInput label="Ícono (emoji)" value={icon} onChangeText={setIcon} placeholder="💳" />
        <FormInput label="Color (hex)" value={color} onChangeText={setColor} placeholder="#4F46E5" />

        <PrimaryButton onPress={handleSubmit} loading={saving} disabled={!name.trim()}>
          {isNew ? 'Crear Cuenta' : 'Guardar Cambios'}
        </PrimaryButton>

        {/* Movements section — edit mode only */}
        {!isNew && (
          <View className="mt-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-base font-bold">Movimientos</Text>
              <TouchableOpacity
                onPress={() => setShowMovementForm((v) => !v)}
                activeOpacity={0.7}
                className="border border-primary rounded-lg px-3 py-1.5"
              >
                <Text className="text-primary text-sm">
                  {showMovementForm ? 'Cancelar' : '+ Nuevo'}
                </Text>
              </TouchableOpacity>
            </View>

            {showMovementForm && (
              <View className="bg-surface border border-border rounded-xl p-4 mb-4">
                <AccountMovementForm
                  userId={user!.id}
                  accounts={allAccounts}
                  onSuccess={() => {
                    setShowMovementForm(false)
                    refreshMovements()
                  }}
                />
              </View>
            )}

            {movements.length === 0 ? (
              <Text className="text-muted text-sm text-center py-4">Sin movimientos</Text>
            ) : (
              movements.map((mov) => {
                const isFrom = mov.from_account_id === id
                return (
                  <View key={mov.id} className="bg-surface border border-border rounded-xl p-3 mb-2">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-white text-sm font-medium">
                          {isFrom
                            ? `→ ${mov.to_account?.name}`
                            : `← ${mov.from_account?.name}`}
                        </Text>
                        <Text className="text-muted text-xs mt-0.5">
                          {[mov.description, mov.date].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View className="items-end ml-2">
                        <Text className={`font-bold text-sm ${isFrom ? 'text-red-400' : 'text-green-400'}`}>
                          {isFrom
                            ? `-${formatCurrency(mov.from_amount, mov.from_currency)}`
                            : `+${formatCurrency(mov.to_amount, mov.to_currency)}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteMovement(mov.id)}
                          activeOpacity={0.7}
                          className="mt-1"
                        >
                          <Text className="text-red-400 text-xs">Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}
      </ScrollView>

      <SelectModal
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        title="Tipo de cuenta"
        options={TYPE_OPTIONS}
        selected={type}
        onSelect={(v) => { setType(v); setShowTypePicker(false) }}
      />
      <SelectModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Moneda"
        options={CURRENCY_OPTIONS}
        selected={currency}
        onSelect={(v) => { setCurrency(v as Currency); setShowCurrencyPicker(false) }}
      />
    </SafeAreaView>
  )
}
