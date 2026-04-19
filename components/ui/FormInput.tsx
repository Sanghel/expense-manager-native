import { View, Text, TextInput, type TextInputProps } from 'react-native'

interface Props extends TextInputProps {
  label: string
}

export function FormInput({ label, style, ...props }: Props) {
  return (
    <View className="mb-4">
      <Text className="text-muted text-sm mb-1">{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#B0B0B0"
        className="bg-surface border border-border rounded-xl px-4 py-3 text-white"
      />
    </View>
  )
}
