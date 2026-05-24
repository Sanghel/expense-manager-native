import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'

interface ProgressBarProps {
  /** Progreso entre 0 y 1. Valores > 1 se clampan al render (la barra llena), pero `value` puede pasarse sin clamp. */
  value: number
  /** Override de color de la barra. Si se omite, se elige por umbral del value. */
  color?: string
  /** Altura en px. Default 8. */
  height?: number
  /** Duración de la animación de transición. Default 400ms. */
  duration?: number
  /** Color del track de fondo. Default `bg-border` (#27272a). */
  trackColor?: string
}

/**
 * Barra de progreso animada (UI thread con reanimated).
 *
 * `value` puede exceder 1 (presupuesto sobrepasado). Visualmente se llena al 100%
 * pero el caller puede usar el valor real para mostrar texto "120%" aparte.
 *
 * Color por defecto:
 *   < 0.7  → verde
 *   < 1.0  → amarillo
 *   ≥ 1.0  → rojo (excedido)
 */
export function ProgressBar({
  value,
  color,
  height = 8,
  duration = 400,
  trackColor = '#27272a',
}: ProgressBarProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    const clamped = Math.max(0, Math.min(value, 1))
    progress.value = withTiming(clamped, {
      duration,
      easing: Easing.out(Easing.cubic),
    })
  }, [value, duration, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  const resolvedColor = color ?? defaultColor(value)

  return (
    <View
      style={{
        height,
        backgroundColor: trackColor,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: resolvedColor,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  )
}

/**
 * Mapea `value` (0..∞) a color por umbral. Exportado por si el caller quiere
 * usar el mismo color en otro lado (badge, texto, etc.).
 */
export function defaultColor(value: number): string {
  if (value >= 1) return '#ef4444' // red-500 — excedido
  if (value >= 0.7) return '#f59e0b' // amber-500 — atención
  return '#10b981' // emerald-500 — saludable
}
