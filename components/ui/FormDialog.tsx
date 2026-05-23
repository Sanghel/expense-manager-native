import { type ReactNode } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface FormDialogProps {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
}

/**
 * Modal full-screen para formularios. Compone:
 * - Modal slide animation
 * - SafeAreaView (notch + home indicator)
 * - KeyboardAvoidingView (input no tapado por teclado)
 * - ScrollView con keyboardShouldPersistTaps
 * - Header con título + cerrar
 * - Footer opcional para botones de acción
 */
export function FormDialog({
  visible,
  onClose,
  title,
  children,
  footer,
  closeLabel = 'Cerrar',
}: FormDialogProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-white text-base font-bold">{title}</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-primary text-base">{closeLabel}</Text>
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {/* Footer opcional */}
          {footer ? (
            <View className="px-4 py-3 border-t border-border">{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
