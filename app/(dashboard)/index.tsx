// app/(dashboard)/index.tsx
//
// T-4.1 placeholder: muestra los tres charts con mock data para verificar
// que victory-native + Skia están configurados correctamente. T-4.2 va a
// reemplazar esto con datos reales y summary cards.
import { ScrollView, View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { DemoAccumulatedBalanceChart } from '@/components/charts/AccumulatedBalanceChart'
import { DemoExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { DemoMonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart'

export default function DashboardScreen() {
  const { user } = useAuth()
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Dashboard</Text>
        <Text className="text-muted text-xs mt-0.5">
          Hola, {user?.name ?? user?.email}
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text className="text-amber-400 text-xs">
          T-4.1: preview con mock data. T-4.2 conecta datos reales.
        </Text>
        <DemoAccumulatedBalanceChart />
        <DemoExpensesByCategoryChart />
        <DemoMonthlyComparisonChart />
      </ScrollView>
    </SafeAreaView>
  )
}
