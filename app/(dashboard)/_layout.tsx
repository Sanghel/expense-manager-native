// app/(dashboard)/_layout.tsx
//
// Tab bar principal. El tab "+" (Crear) intercepta el tap y abre un bottom
// sheet con quick actions en lugar de navegar — patrón documentado en
// Obsidian: 30 - Patterns/Tab-intercepted modal sheet.md
import { Tabs, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'
import { Icon } from '@/components/ui/Icon'
import { QuickActionsSheet } from '@/components/quick-actions/QuickActionsSheet'

export default function DashboardLayout() {
  const { user, loading } = useAuth()
  const [sheetVisible, setSheetVisible] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login')
    }
  }, [user, loading])

  if (loading || !user) return null

  return (
    <View style={{ flex: 1 }}>
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
          name="calendar"
          options={{
            title: 'Calendario',
            tabBarIcon: ({ color, size }) => (
              <Icon name="calendar" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ color, size }) => (
              <Icon name="chart" color={color} size={size} />
            ),
          }}
        />

        {/*
          Tab "+" — intercepta el tabPress para abrir el sheet de quick
          actions en lugar de navegar. `href: null` previene el navigate;
          el listener captura el tap antes de cualquier navegación.

          Apunta a `profile` solo para tener una ruta válida — pero el
          listener cancela el navigate y abre el sheet.
        */}
        <Tabs.Screen
          name="quick-actions"
          options={{
            title: 'Menú',
            tabBarIcon: ({ color, size }) => (
              <Icon name="menu" color={color} size={size} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setSheetVisible(true)
            },
          }}
        />

        {/*
          Hubs accesibles vía router.push, no en el tab bar.
          - profile: accesible desde el sheet de quick actions
          - el resto: desde profile > Datos
        */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="accounts" options={{ href: null }} />
        <Tabs.Screen name="categories" options={{ href: null }} />
        <Tabs.Screen name="budgets" options={{ href: null }} />
        <Tabs.Screen name="savings" options={{ href: null }} />
        <Tabs.Screen name="loans" options={{ href: null }} />
        <Tabs.Screen name="reminders" options={{ href: null }} />
      </Tabs>

      <QuickActionsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  )
}
