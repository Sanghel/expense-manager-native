// app/(dashboard)/_layout.tsx
import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'
import { Icon } from '@/components/ui/Icon'

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
          tabBarIcon: ({ color, size }) => (
            <Icon name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transacciones',
          tabBarIcon: ({ color, size }) => (
            <Icon name="transactions" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Cuentas',
          tabBarIcon: ({ color, size }) => (
            <Icon name="wallet" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: ({ color, size }) => (
            <Icon name="menu" color={color} size={size} />
          ),
        }}
      />

      {/*
        Hubs accesibles desde la pantalla "Más" — NO se exponen como tabs
        directos para mantener el bottom bar limpio. expo-router los
        descubre automáticamente al tener _layout.tsx; href: null los
        oculta del tab bar pero quedan navegables con router.push('/xxx').
      */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="savings" options={{ href: null }} />
      <Tabs.Screen name="loans" options={{ href: null }} />
    </Tabs>
  )
}
