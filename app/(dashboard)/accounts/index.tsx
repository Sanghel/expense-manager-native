import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getAccounts, deleteAccount } from '@/lib/actions/accounts.actions'
import { AccountCard } from '@/components/accounts/AccountCard'
import { formatCurrency } from '@/lib/utils/currency'
import type { Account, Currency } from '@/types/database.types'

export default function AccountsScreen() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    const result = await getAccounts(user.id)
    if (result.success && result.data) setAccounts(result.data)
    setLoading(false)
    setRefreshing(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchAccounts()
    }, [fetchAccounts])
  )

  async function handleDelete(id: string) {
    if (!user) return
    const result = await deleteAccount(id, user.id)
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } else {
      Alert.alert('Error', result.error)
    }
  }

  const totalByCurrency = accounts.reduce<Record<string, number>>((acc, account) => {
    acc[account.currency] = (acc[account.currency] ?? 0) + account.balance
    return acc
  }, {})

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Cuentas</Text>
        {Object.entries(totalByCurrency).length > 0 && (
          <View className="flex-row gap-4 mt-1">
            {Object.entries(totalByCurrency).map(([cur, total]) => (
              <Text key={cur} className="text-muted text-xs">
                {formatCurrency(total, cur as Currency)}
              </Text>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              onPress={() => router.push(`/(dashboard)/accounts/${item.id}`)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAccounts() }}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-muted text-base">No hay cuentas</Text>
              <Text className="text-muted text-sm mt-1">Toca + para crear una</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(dashboard)/accounts/new')}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl leading-none">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
