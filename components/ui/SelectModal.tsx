import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export interface SelectOption {
  label: string
  value: string
}

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  options: SelectOption[]
  selected?: string
  onSelect: (value: string) => void
}

export function SelectModal({ visible, onClose, title, options, selected, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <SafeAreaView edges={['bottom']} className="bg-surface rounded-t-2xl" style={{ maxHeight: '65%' }}>
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
            <Text className="text-white text-base font-bold">{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-2">
              <Text className="text-muted text-xl leading-none">✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item.value)}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-4 py-4 border-b border-border ${
                  selected === item.value ? 'bg-primary/20' : ''
                }`}
              >
                <Text className="text-white flex-1">{item.label}</Text>
                {selected === item.value && (
                  <Text className="text-primary font-bold ml-2">✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  )
}
