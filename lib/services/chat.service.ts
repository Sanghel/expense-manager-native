// lib/services/chat.service.ts
//
// Wrapper sobre la edge function `ai-categorize-purchase` de InsForge.
// El SDK adjunta automáticamente el bearer token del usuario logueado,
// así que no necesitamos pasar auth headers manualmente.
import { insforge } from '@/lib/insforge'
import type { Category, Currency, TransactionType } from '@/types/database.types'

export interface CategorizedTransaction {
  amount: number
  description: string
  category_id: string
  type: TransactionType
  currency: Currency
  date: string
}

export interface CategorizeSuccess {
  success: true
  data: CategorizedTransaction
}

export interface CategorizeError {
  success: false
  error: string
}

export type CategorizeResult = CategorizeSuccess | CategorizeError

/**
 * Envía el texto del usuario + las categorías disponibles a la edge function.
 * El backend llama a Claude haiku-4-5 y devuelve la transacción estructurada.
 *
 * Nota: solo enviamos id/name/type — el resto de campos de Category (icon,
 * color, user_id) no son útiles para la IA y aumentarían tokens.
 */
export async function categorizePurchaseText(
  text: string,
  categories: Category[]
): Promise<CategorizeResult> {
  try {
    const { data, error } = await insforge.functions.invoke(
      'ai-categorize-purchase',
      {
        body: {
          text,
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          })),
        },
      }
    )

    if (error) {
      return { success: false, error: error.message ?? 'Error al llamar a la IA' }
    }
    if (!data) {
      return { success: false, error: 'Respuesta vacía de la IA' }
    }

    // La edge function ya devuelve el shape correcto.
    return data as CategorizeResult
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}
