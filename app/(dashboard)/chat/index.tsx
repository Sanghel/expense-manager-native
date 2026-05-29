// app/(dashboard)/chat/index.tsx
//
// Chat IA para registrar gastos. Usuario escribe texto libre, lo enviamos
// a la edge function `ai-categorize-purchase` (Claude haiku-4-5), la IA
// devuelve una transacción estructurada, el usuario confirma → se crea.
//
// La FlatList va invertida (`inverted`) — patrón estándar para chat:
// nuevos mensajes aparecen abajo, scroll automático al final, scroll-up
// para ver historial.
//
// Estado mínimo en esta versión:
//  - Sin persistencia: el historial se pierde al cerrar la pantalla
//  - Sin voz: solo input de texto (agregar en PR siguiente)
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getCategories } from '@/lib/actions/categories.actions'
import { createTransaction } from '@/lib/actions/transactions.actions'
import { categorizePurchaseText } from '@/lib/services/chat.service'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { TransactionPreview } from '@/components/chat/TransactionPreview'
import { MicButton } from '@/components/chat/MicButton'
import { Icon } from '@/components/ui/Icon'
import { toast } from '@/components/ui/Toast'
import { loadHistory, saveHistory } from '@/lib/storage/chat-history'
import type { Category } from '@/types/database.types'
import type { CategorizedTransaction } from '@/lib/services/chat.service'

type ChatItem =
  | { kind: 'message'; id: string; role: 'user' | 'assistant'; text: string }
  | {
      kind: 'preview'
      id: string
      transaction: CategorizedTransaction
      status: 'pending' | 'creating' | 'created'
    }

const WELCOME_TEXT =
  '¡Hola! Cuéntame qué gastaste o ingresaste y lo registro por ti. Ejemplos:\n\n• "Gasté 25.000 en café"\n• "Recibí 100 dólares de freelance ayer"'

const WELCOME_ITEM: ChatItem = {
  kind: 'message',
  id: 'welcome',
  role: 'assistant',
  text: WELCOME_TEXT,
}

export default function ChatScreen() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<ChatItem[]>([WELCOME_ITEM])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const listRef = useRef<FlatList>(null)

  // Cargar categorías + historial al montar
  useEffect(() => {
    if (!user) return
    getCategories(user.id).then((res) => {
      if (res.success && res.data) setCategories(res.data)
    })
    loadHistory(user.id).then((stored) => {
      if (stored.length > 0) {
        // Si la última preview quedó en 'creating' por un cierre abrupto,
        // la rebajamos a 'pending' para que el user pueda decidir.
        const recovered = stored.map((it) =>
          it.kind === 'preview' && it.status === 'creating'
            ? { ...it, status: 'pending' as const }
            : it
        )
        setItems([WELCOME_ITEM, ...recovered])
      }
      setHydrated(true)
    })
  }, [user])

  // Guardar historial cada vez que cambia. Omitimos el welcome item (siempre
  // se reinyecta al cargar). Solo guardamos después de hidratar para evitar
  // sobrescribir el storage durante el load inicial.
  useEffect(() => {
    if (!user || !hydrated) return
    const toStore = items.filter((it) => it.id !== 'welcome')
    saveHistory(user.id, toStore)
  }, [items, user, hydrated])

  const categoriesById = useCallback(
    (id: string) => categories.find((c) => c.id === id) ?? null,
    [categories]
  )

  const pushItems = useCallback((newItems: ChatItem[]) => {
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const updatePreview = useCallback(
    (id: string, status: 'pending' | 'creating' | 'created') => {
      setItems((prev) =>
        prev.map((it) =>
          it.kind === 'preview' && it.id === id ? { ...it, status } : it
        )
      )
    },
    []
  )

  const removePreview = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => !(it.kind === 'preview' && it.id === id)))
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !user) return
    setInput('')
    setSending(true)

    const userId = `m-${Date.now()}`
    pushItems([{ kind: 'message', id: userId, role: 'user', text }])

    const res = await categorizePurchaseText(text, categories)

    if (!res.success) {
      pushItems([
        {
          kind: 'message',
          id: `m-${Date.now()}-err`,
          role: 'assistant',
          text: res.error,
        },
      ])
    } else {
      pushItems([
        {
          kind: 'preview',
          id: `p-${Date.now()}`,
          transaction: res.data,
          status: 'pending',
        },
      ])
    }

    setSending(false)
  }

  async function handleConfirmPreview(
    previewId: string,
    transaction: CategorizedTransaction
  ) {
    if (!user) return
    updatePreview(previewId, 'creating')

    const createRes = await createTransaction(user.id, {
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      category_id: transaction.category_id,
      date: transaction.date,
    })

    if (!createRes.success) {
      updatePreview(previewId, 'pending')
      toast.error(createRes.error ?? 'No se pudo crear la transacción')
      return
    }

    updatePreview(previewId, 'created')
    toast('Transacción registrada')
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Chat IA</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={[...items].reverse()}
          keyExtractor={(it) => it.id}
          inverted
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => {
            if (item.kind === 'message') {
              return <MessageBubble role={item.role} text={item.text} />
            }
            return (
              <TransactionPreview
                transaction={item.transaction}
                category={categoriesById(item.transaction.category_id)}
                status={item.status}
                onConfirm={() => handleConfirmPreview(item.id, item.transaction)}
                onDiscard={() => removePreview(item.id)}
              />
            )
          }}
        />

        {/* Input bar */}
        <View className="flex-row items-end gap-2 px-3 py-2 border-t border-border bg-bg">
          <MicButton
            disabled={sending}
            onPartial={setInput}
            onFinal={setInput}
          />
          <View className="flex-1 bg-surface border border-border rounded-2xl px-3 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escribe o usa el micrófono…"
              placeholderTextColor="#6b7280"
              multiline
              maxLength={500}
              editable={!sending}
              className="text-white text-base"
              style={{ maxHeight: 120, minHeight: 24 }}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || input.trim().length === 0}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
              sending || input.trim().length === 0
                ? 'bg-surface border border-border'
                : 'bg-primary'
            }`}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Icon
                name="send"
                color={input.trim().length === 0 ? '#6b7280' : '#ffffff'}
                size={20}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
