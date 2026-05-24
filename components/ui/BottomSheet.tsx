import { useEffect, type ReactNode } from 'react'
import { Modal, Pressable, View, useWindowDimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: ReactNode
  /** Altura máxima en % del viewport. Default 60%. */
  maxHeightPercent?: number
}

/**
 * Bottom sheet simple — Modal RN + Animated.View que entra desde abajo con
 * reanimated. Tap fuera del card cierra.
 *
 * Distinto a [[FormDialog]]:
 * - FormDialog ocupa toda la pantalla (modal full-screen).
 * - BottomSheet ocupa solo la parte inferior, deja la pantalla visible atrás
 *   (con un overlay semi-transparente).
 *
 * NO incluye drag-to-dismiss ni snap points (para eso `@gorhom/bottom-sheet`).
 * Sirve para menús de acciones rápidas, action sheets simples y pickers.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightPercent = 60,
}: BottomSheetProps) {
  const { height } = useWindowDimensions()
  const translateY = useSharedValue(height) // empieza fuera de pantalla (abajo)

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      })
    } else {
      translateY.value = withTiming(height, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      })
    }
  }, [visible, height, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  /**
   * Cerrar con la animación inversa antes de llamar onClose. Si llamamos
   * onClose directo el Modal se desmonta de golpe y se ve el "salto".
   */
  function handleClose() {
    translateY.value = withTiming(
      height,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)()
      }
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // animamos nosotros con reanimated
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Overlay tap-to-close */}
      <Pressable
        className="flex-1 bg-black/60 justify-end"
        onPress={handleClose}
      >
        {/* El card mismo no propaga el tap */}
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[
              {
                maxHeight: `${maxHeightPercent}%`,
              },
              animatedStyle,
            ]}
            className="bg-surface border-t border-border rounded-t-3xl"
          >
            {/* Handle visual (no funcional, solo affordance) */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 bg-border rounded-full" />
            </View>
            <View className="px-4 pb-6 pt-2">{children}</View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
