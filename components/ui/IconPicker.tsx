import { Modal, View, Text, Pressable, FlatList } from 'react-native'

interface IconPickerProps {
  visible: boolean
  onClose: () => void
  selected?: string
  onSelect: (icon: string) => void
  icons?: string[]
  title?: string
}

const DEFAULT_ICONS = [
  '💰', '💵', '💸', '🏦', '💳', '📊',
  '📈', '📉', '🪙', '💎', '🛒', '🍔',
  '🍕', '☕', '🚗', '⛽', '✈️', '🏠',
  '💡', '📱', '🎬', '🎮', '👕', '💊',
  '🏥', '💼', '🎓', '📚', '🎁', '🐾',
  '🌳', '🎯', '⭐', '❤️', '🔧', '📦',
]

/**
 * Picker en bottom-sheet con grid de emojis. Cierra al seleccionar.
 * Por defecto incluye emojis financieros + comunes.
 */
export function IconPicker({
  visible,
  onClose,
  selected,
  onSelect,
  icons = DEFAULT_ICONS,
  title = 'Elegir icono',
}: IconPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-surface rounded-t-2xl pb-8 max-h-[70%]" onPress={() => {}}>
          {/* Header */}
          <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
            <Text className="text-white text-lg font-bold">{title}</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-primary text-base">Cerrar</Text>
            </Pressable>
          </View>

          {/* Grid */}
          <FlatList
            data={icons}
            numColumns={6}
            keyExtractor={(item) => item}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item)
                  onClose()
                }}
                className={`flex-1 aspect-square items-center justify-center m-1 rounded-xl active:opacity-60 ${
                  selected === item ? 'bg-primary/20 border border-primary' : ''
                }`}
              >
                <Text className="text-3xl">{item}</Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
