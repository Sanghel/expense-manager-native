import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useState, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getTransactions, deleteTransaction } from '@/lib/actions/transactions.actions'
import { TransactionCard } from '@/components/transactions/TransactionCard'
import type { TransactionWithCategory } from '@/types/database.types'

export default function TransactionsScreen() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    const result = await getTransactions(user.id)
    if (result.success && result.data) setTransactions(result.data)
    setLoading(false)
    setRefreshing(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchTransactions()
    }, [fetchTransactions])
  )

  async function handleDelete(id: string) {
    if (!user) return
    const result = await deleteTransaction(id, user.id)
    if (result.success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Transacciones</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              onPress={() => router.push(`/(dashboard)/transactions/${item.id}`)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTransactions() }}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-muted text-base">No hay transacciones</Text>
              <Text className="text-muted text-sm mt-1">Toca + para crear una</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(dashboard)/transactions/new')}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl leading-none">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
