// app/(dashboard)/_layout.tsx
import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { Text } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'

export default function DashboardLayout() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login')
    }
  }, [user, loading])

  if (loading || !user) return null

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transacciones',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💸</Text>,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Cuentas',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏦</Text>,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>☰</Text>,
        }}
      />
    </Tabs>
  )
}
