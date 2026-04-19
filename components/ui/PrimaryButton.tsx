// components/ui/PrimaryButton.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

interface Props {
  onPress: () => void
  children: string
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'outline'
}

export function PrimaryButton({
  onPress,
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
}: Props) {
  const isPrimary = variant === 'primary'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`h-12 rounded-xl items-center justify-center px-6 ${
        isPrimary ? 'bg-primary' : 'border border-border bg-transparent'
      } ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text className={`font-semibold text-base text-white`}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}
