import { Stack } from 'expo-router'
import { colors } from '@/constants/theme'

export default function BudgetsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  )
}
