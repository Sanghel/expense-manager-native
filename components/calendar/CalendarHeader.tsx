import { View, Text, TouchableOpacity } from 'react-native'

export type CalendarTab = 'transactions' | 'reminders'

interface Props {
  value: CalendarTab
  onChange: (tab: CalendarTab) => void
}

const TABS: { value: CalendarTab; label: string }[] = [
  { value: 'transactions', label: 'Transacciones' },
  { value: 'reminders', label: 'Recordatorios' },
]

/**
 * Segmented control con 2 opciones: Transacciones / Recordatorios.
 * Mismo patrón visual que `RangeSelector` de Reports.
 */
export function CalendarHeader({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2 px-4 py-3 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.value === value
        return (
          <TouchableOpacity
            key={tab.value}
            onPress={() => onChange(tab.value)}
            activeOpacity={0.7}
            className={`flex-1 py-2 rounded-xl items-center border ${
              active
                ? 'bg-primary border-primary'
                : 'bg-transparent border-border'
            }`}
          >
            <Text
              className={
                active ? 'text-white text-sm font-semibold' : 'text-muted text-sm'
              }
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
