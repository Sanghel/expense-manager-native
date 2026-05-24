import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getCategories } from '@/lib/actions/categories.actions'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Category, CategoryType } from '@/types/database.types'

const TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  both: 'Ambos',
}

const TYPE_COLORS: Record<CategoryType, string> = {
  income: 'text-green-400',
  expense: 'text-red-400',
  both: 'text-blue-400',
}

export default function CategoriesScreen() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const loadCategories = useCallback(async () => {
    if (!user) return
    const result = await getCategories(user.id)
    if (result.success && result.data) {
      setCategories(result.data)
    }
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadCategories()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadCategories])
  )

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  const userCategories = categories.filter((c) => c.user_id !== null)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Categorías</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={
          categories.length === 0
            ? { flex: 1 }
            : { paddingVertical: 8 }
        }
        ListEmptyComponent={
          <EmptyState
            icon="📂"
            title="Sin categorías"
            description="Toca + para crear tu primera categoría"
          />
        }
        ListHeaderComponent={
          userCategories.length === 0 && categories.length > 0 ? (
            <View className="px-4 py-3">
              <Text className="text-muted text-xs uppercase tracking-wider">
                Categorías del sistema
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isUserOwned = item.user_id !== null

          return (
            <TouchableOpacity
              onPress={() => {
                if (isUserOwned) router.push(`/categories/${item.id}`)
              }}
              disabled={!isUserOwned}
              activeOpacity={isUserOwned ? 0.7 : 1}
              className="flex-row items-center px-4 py-3 border-b border-border"
            >
              <View
                style={{ backgroundColor: item.color ?? '#4F46E5' }}
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
              >
                <Text className="text-xl">{item.icon ?? '📂'}</Text>
              </View>

              <View className="flex-1">
                <Text className="text-white text-base font-medium">
                  {item.name}
                </Text>
                <Text className={`text-xs ${TYPE_COLORS[item.type]}`}>
                  {TYPE_LABELS[item.type]}
                </Text>
              </View>

              {isUserOwned ? (
                <Text className="text-muted text-2xl">›</Text>
              ) : (
                <Text className="text-muted text-xs">Sistema</Text>
              )}
            </TouchableOpacity>
          )
        }}
      />

      {/* FAB — crear nueva */}
      <TouchableOpacity
        onPress={() => router.push('/categories/new')}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text className="text-white text-3xl font-bold" style={{ lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
