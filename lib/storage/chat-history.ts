// lib/storage/chat-history.ts
//
// Persistencia local del historial del chat IA, por usuario, usando
// AsyncStorage (almacenamiento clave-valor simple, asíncrono, no encriptado).
//
// Mantenemos como máximo los últimos `MAX_ITEMS` items para que el archivo
// no crezca sin límite. Es suficiente para chats casuales.
//
// IMPORTANTE: AsyncStorage NO es seguro (no encriptado). No guardamos
// secretos aquí — solo el contenido del chat, que ya es visible al user.
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CategorizedTransaction } from '@/lib/services/chat.service'

export type StoredChatItem =
  | { kind: 'message'; id: string; role: 'user' | 'assistant'; text: string }
  | {
      kind: 'preview'
      id: string
      transaction: CategorizedTransaction
      status: 'pending' | 'creating' | 'created'
    }

const MAX_ITEMS = 50

function storageKey(userId: string): string {
  return `chat-history:${userId}`
}

/** Devuelve el historial guardado o `[]` si no hay nada / hubo error. */
export async function loadHistory(userId: string): Promise<StoredChatItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredChatItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Guarda los últimos `MAX_ITEMS` items. Si la lista está vacía, borra
 * la entrada (evita acumular keys con []).
 *
 * Errores se ignoran en silencio — la persistencia es nice-to-have,
 * no queremos que un fallo de disco rompa el chat.
 */
export async function saveHistory(
  userId: string,
  items: StoredChatItem[]
): Promise<void> {
  try {
    if (items.length === 0) {
      await AsyncStorage.removeItem(storageKey(userId))
      return
    }
    const trimmed = items.slice(-MAX_ITEMS)
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(trimmed))
  } catch {
    // silenciar
  }
}

/** Borra el historial del usuario. Útil para botón "Limpiar chat". */
export async function clearHistory(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId))
  } catch {
    // silenciar
  }
}
