import { View, Text, TouchableOpacity } from 'react-native'
import { RANGE_LABEL, type ReportRange } from '@/lib/utils/reports'

const RANGES: ReportRange[] = ['1M', '3M', '6M', '1Y']

interface Props {
  value: ReportRange
  onChange: (range: ReportRange) => void
}

/**
 * Segmented control para elegir rango de tiempo del reporte. Row de chips
 * activable. El chip activo va con fondo primary; los demás con borde sutil.
 */
export function RangeSelector({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2">
      {RANGES.map((r) => {
        const active = r === value
        return (
          <TouchableOpacity
            key={r}
            onPress={() => onChange(r)}
            activeOpacity={0.7}
            className={`flex-1 py-2 rounded-xl items-center border ${
              active
                ? 'bg-primary border-primary'
                : 'bg-transparent border-border'
            }`}
          >
            <Text className={active ? 'text-white text-sm font-semibold' : 'text-muted text-sm'}>
              {RANGE_LABEL[r]}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
