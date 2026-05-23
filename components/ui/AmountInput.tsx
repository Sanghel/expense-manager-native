import { TextInput, View, Text } from 'react-native'

interface AmountInputProps {
  value: string
  onChangeText: (text: string) => void
  label?: string
  placeholder?: string
  currency?: string
  error?: string
  editable?: boolean
}

/**
 * Input numérico para montos de dinero. Wrapper sobre TextInput con:
 * - Teclado decimal nativo
 * - Filtro inline (solo dígitos + un punto decimal)
 * - Prefijo opcional de currency
 * - Label + error display
 */
export function AmountInput({
  value,
  onChangeText,
  label,
  placeholder = '0.00',
  currency,
  error,
  editable = true,
}: AmountInputProps) {
  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const normalized =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
    onChangeText(normalized)
  }

  return (
    <View className="mb-4">
      {label ? <Text className="text-muted text-sm mb-1">{label}</Text> : null}
      <View
        className={`flex-row items-center bg-surface border rounded-xl px-4 py-3 ${
          error ? 'border-red-500' : 'border-border'
        }`}
      >
        {currency ? (
          <Text className="text-muted text-base mr-2">{currency}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#6b7280"
          editable={editable}
          className="flex-1 text-white text-base"
        />
      </View>
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  )
}
