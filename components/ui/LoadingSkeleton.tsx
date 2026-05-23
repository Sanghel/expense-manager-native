import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated'

type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface LoadingSkeletonProps {
  width?: number | `${number}%`
  height?: number
  rounded?: Rounded
  className?: string
}

const ROUNDED_CLASSES: Record<Rounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

/**
 * Placeholder animado para mostrar mientras se carga data.
 * Pulsa opacity entre 0.5 y 1.0 cada 1.6s (worklet en UI thread).
 *
 * Componer múltiples para layouts de loading list/card:
 *   <LoadingSkeleton height={20} width="60%" />
 *   <LoadingSkeleton height={14} width="40%" />
 */
export function LoadingSkeleton({
  width = '100%',
  height = 16,
  rounded = 'md',
  className = '',
}: LoadingSkeletonProps) {
  const opacity = useSharedValue(0.5)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1, // repeat infinite
      false
    )
    return () => cancelAnimation(opacity)
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[{ width, height }, animatedStyle]}
      className={`bg-border ${ROUNDED_CLASSES[rounded]} ${className}`}
    />
  )
}
