import { Stack } from 'expo-router'
import { colors } from '@/constants/theme'

export default function PlanningLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  )
}
