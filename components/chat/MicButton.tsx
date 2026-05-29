// components/chat/MicButton.tsx
//
// Botón de micrófono que arranca/para grabación con expo-speech-recognition.
// La transcripción es **on-device** (sin backend) — usa el motor nativo de
// speech recognition de iOS/Android. Gratis, privado, sin tokens.
//
// API simple:
//  - Tap → pide permiso si hace falta, arranca `start({ lang: 'es-ES' })`
//  - Mientras graba, botón pulsa (rojo) y el listener `result` actualiza
//    el padre con el texto parcial; al `end` el padre tiene el texto final.
//  - Tap de nuevo → para. Si hay error, toast.
//
// Idioma fijo a español. Si después queremos multi-idioma, lo hacemos prop.
import { useCallback, useState } from 'react'
import { TouchableOpacity, ActivityIndicator } from 'react-native'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { Mic, MicOff } from 'lucide-react-native'
import { toast } from '@/components/ui/Toast'

interface Props {
  /** Llamado en cada update parcial de transcripción. */
  onPartial: (text: string) => void
  /** Llamado cuando termina la grabación con el texto final. */
  onFinal: (text: string) => void
  /** Deshabilita el botón (cuando se está enviando un mensaje, p.ej.). */
  disabled?: boolean
}

export function MicButton({ onPartial, onFinal, disabled }: Props) {
  const [recording, setRecording] = useState(false)
  const [starting, setStarting] = useState(false)

  // Estos eventos disparan globalmente — válido porque solo hay un
  // MicButton en pantalla a la vez (input bar del chat).
  useSpeechRecognitionEvent('start', () => setRecording(true))
  useSpeechRecognitionEvent('end', () => setRecording(false))
  useSpeechRecognitionEvent('error', (e) => {
    setRecording(false)
    setStarting(false)
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      toast.error(`Error de voz: ${e.error}`)
    }
  })
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? ''
    if (e.isFinal) {
      onFinal(text)
    } else {
      onPartial(text)
    }
  })

  const handlePress = useCallback(async () => {
    if (recording) {
      ExpoSpeechRecognitionModule.stop()
      return
    }
    if (starting || disabled) return

    setStarting(true)
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!perm.granted) {
        toast.error('Necesito permiso de micrófono y voz para escucharte')
        return
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        continuous: false,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude iniciar la grabación')
    } finally {
      setStarting(false)
    }
  }, [recording, starting, disabled])

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Detener grabación' : 'Grabar voz'}
      accessibilityState={{ disabled: !!disabled }}
      className={`w-11 h-11 rounded-2xl items-center justify-center ${
        recording
          ? 'bg-red-500'
          : disabled
          ? 'bg-surface border border-border'
          : 'bg-surface border border-border'
      }`}
    >
      {starting ? (
        <ActivityIndicator color="#9ca3af" size="small" />
      ) : recording ? (
        <MicOff size={20} color="#ffffff" strokeWidth={2} />
      ) : (
        <Mic size={20} color={disabled ? '#6b7280' : '#9ca3af'} strokeWidth={2} />
      )}
    </TouchableOpacity>
  )
}
