// app/(dashboard)/more.tsx
import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { updateUser } from '@/lib/actions/users.actions'
import { SelectModal } from '@/components/ui/SelectModal'
import { Icon, type IconName } from '@/components/ui/Icon'
import { toast } from '@/components/ui/Toast'
import type { Currency } from '@/types/database.types'

const CURRENCY_OPTIONS: { label: string; value: string }[] = [
  { label: 'COP — Peso Colombiano', value: 'COP' },
  { label: 'USD — Dólar', value: 'USD' },
  { label: 'VES — Bolívar (Bs)', value: 'VES' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function MoreScreen() {
  const { user, signOut, refreshUser } = useAuth()
  const [showCurrency, setShowCurrency] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)

  if (!user) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  async function handleCurrencyChange(value: string) {
    setShowCurrency(false)
    if (!user || value === user.preferred_currency) return
    setSavingCurrency(true)
    const result = await updateUser(user.id, {
      preferred_currency: value as Currency,
    })
    setSavingCurrency(false)
    if (result.success) {
      await refreshUser()
      toast.success('Moneda actualizada')
    } else {
      toast.error(result.error ?? 'Error al actualizar moneda')
    }
  }

  const gmailConnected = !!user.gmail_connected_at
  const initial = (user.name ?? user.email).charAt(0).toUpperCase()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Más opciones</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile card */}
        <View className="px-4 py-6 flex-row items-center border-b border-border">
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              className="w-16 h-16 rounded-full mr-4"
            />
          ) : (
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
              <Text className="text-white text-2xl font-bold">{initial}</Text>
            </View>
          )}
          <View className="flex-1">
            {user.name ? (
              <Text className="text-white text-lg font-semibold">
                {user.name}
              </Text>
            ) : null}
            <Text className="text-muted text-sm">{user.email}</Text>
          </View>
        </View>

        {/* Preferencias */}
        <SectionHeader title="Preferencias" />
        <SettingsRow
          icon="wallet"
          label="Moneda preferida"
          value={user.preferred_currency}
          onPress={() => setShowCurrency(true)}
          loading={savingCurrency}
        />

        {/* Conexiones */}
        <SectionHeader title="Conexiones" />
        <View className="px-4 py-3 border-b border-border">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-full bg-surface items-center justify-center mr-3">
              <Text className="text-base">✉️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-base">Gmail</Text>
              <Text
                className={
                  gmailConnected
                    ? 'text-green-400 text-xs mt-0.5'
                    : 'text-muted text-xs mt-0.5'
                }
              >
                {gmailConnected ? 'Conectado' : 'No conectado'}
              </Text>
            </View>
          </View>
          {gmailConnected ? (
            <View className="ml-12 mt-2 gap-0.5">
              <Text className="text-muted text-xs">
                Conectado el {formatDate(user.gmail_connected_at)}
              </Text>
              <Text className="text-muted text-xs">
                Última sync: {formatDate(user.gmail_last_synced_at)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Datos */}
        <SectionHeader title="Datos" />
        <SettingsRow
          icon="dashboard"
          label="Categorías"
          onPress={() => router.push('/categories')}
        />

        {/* Sign out */}
        <View className="px-4 pt-10">
          <TouchableOpacity
            onPress={signOut}
            activeOpacity={0.8}
            className="border border-red-500 rounded-xl py-3 items-center"
          >
            <Text className="text-red-400 font-semibold">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SelectModal
        visible={showCurrency}
        onClose={() => setShowCurrency(false)}
        title="Moneda preferida"
        options={CURRENCY_OPTIONS}
        selected={user.preferred_currency}
        onSelect={handleCurrencyChange}
      />
    </SafeAreaView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-muted text-xs uppercase tracking-wider">
        {title}
      </Text>
    </View>
  )
}

interface SettingsRowProps {
  icon: IconName
  label: string
  value?: string
  onPress: () => void
  loading?: boolean
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  loading,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={loading}
      className="px-4 py-3 flex-row items-center border-b border-border"
    >
      <View className="w-9 h-9 rounded-full bg-surface items-center justify-center mr-3">
        <Icon name={icon} size={18} color="#B0B0B0" />
      </View>
      <Text className="text-white text-base flex-1">{label}</Text>
      {loading ? (
        <ActivityIndicator color="#4F46E5" size="small" />
      ) : (
        <View className="flex-row items-center">
          {value ? (
            <Text className="text-muted text-sm mr-2">{value}</Text>
          ) : null}
          <Icon name="chevron-right" size={18} color="#6b7280" />
        </View>
      )}
    </TouchableOpacity>
  )
}
