import { Modal, View, Text, Pressable, FlatList } from 'react-native'

interface ColorPickerProps {
  visible: boolean
  onClose: () => void
  selected?: string
  onSelect: (color: string) => void
  colors?: string[]
  title?: string
}

const DEFAULT_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F97316', '#F59E0B',
  '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#F43F5E', '#64748B', '#71717A', '#737373', '#525252', '#3F3F46',
]

/**
 * Picker en bottom-sheet con grid de swatches de color. Cierra al seleccionar.
 * Mismo patrón que IconPicker — solo cambia el contenido del swatch.
 */
export function ColorPicker({
  visible,
  onClose,
  selected,
  onSelect,
  colors = DEFAULT_COLORS,
  title = 'Elegir color',
}: ColorPickerProps) {
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

          {/* Grid de swatches */}
          <FlatList
            data={colors}
            numColumns={6}
            keyExtractor={(item) => item}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item)
                  onClose()
                }}
                className="flex-1 aspect-square m-1 rounded-xl items-center justify-center active:opacity-60"
                style={{ backgroundColor: item }}
              >
                {selected === item ? (
                  <Text className="text-white text-2xl font-bold">✓</Text>
                ) : null}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
