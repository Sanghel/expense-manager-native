import { useEffect, type ReactNode } from 'react'
import { Modal, Pressable, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
 *
 * **Bug fix:** sin `presentationStyle="overFullScreen"` en iOS, el Modal NO
 * cubre el área del tab bar / safe area inferior — el overlay queda "corto"
 * y el tab bar se ve dimmed pero visible debajo del card. Con overFullScreen
 * el modal sí cubre toda la ventana. Además aplicamos `paddingBottom` con
 * el safe area inset para que el contenido del card no quede pegado al
 * home indicator.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightPercent = 60,
}: BottomSheetProps) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
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
      presentationStyle="overFullScreen"
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
                // El safe area inferior se mete dentro del card como padding
                // — así el card se extiende a la base de la pantalla y los
                // botones quedan por encima del home indicator / tab bar.
                paddingBottom: insets.bottom,
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
