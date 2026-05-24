import { useState } from 'react'
import { View, Text, Pressable, Modal, Platform } from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

interface DateInputProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  label?: string
  error?: string
  placeholder?: string
  minimumDate?: Date
  maximumDate?: Date
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Input de fecha con picker nativo. Maneja la complejidad cross-platform
 * de @react-native-community/datetimepicker:
 * - iOS: picker en bottom-sheet Modal con botón "Listo"
 * - Android: dialog nativo que se abre/cierra solo
 *
 * Value se almacena como string YYYY-MM-DD (compatible con DB).
 */
export function DateInput({
  value,
  onChange,
  label,
  error,
  placeholder = 'Seleccionar fecha',
  minimumDate,
  maximumDate,
}: DateInputProps) {
  const [show, setShow] = useState(false)
  const currentDate = value ? new Date(`${value}T00:00:00`) : new Date()

  function handleAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShow(false)
    if (event.type === 'set' && selectedDate) {
      onChange(formatDate(selectedDate))
    }
  }

  function handleIosChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (selectedDate) {
      onChange(formatDate(selectedDate))
    }
  }

  return (
    <View className="mb-4">
      {label ? <Text className="text-muted text-sm mb-1">{label}</Text> : null}

      <Pressable
        onPress={() => setShow(true)}
        className={`bg-surface border rounded-xl px-4 py-3 active:opacity-70 ${
          error ? 'border-red-500' : 'border-border'
        }`}
      >
        <Text className={value ? 'text-white' : 'text-muted'}>
          {value || placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'android' && show ? (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <Pressable
            className="flex-1 bg-black/60 justify-end"
            onPress={() => setShow(false)}
          >
            <Pressable className="bg-surface pb-4" onPress={() => {}}>
              <View className="flex-row justify-end px-4 py-2 border-b border-border">
                <Pressable
                  onPress={() => setShow(false)}
                  className="active:opacity-60"
                >
                  <Text className="text-primary text-base font-semibold">
                    Listo
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleIosChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant="dark"
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  )
}
