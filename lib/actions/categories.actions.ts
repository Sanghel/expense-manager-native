import { insforge } from '@/lib/insforge'
import type { Category } from '@/types/database.types'

export async function getCategories(userId: string): Promise<{ success: boolean; data?: Category[]; error?: string }> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const [{ data: predefined, error: e1 }, { data: userCats, error: e2 }] = await Promise.all([
      insforge.database.from('categories').select('*').is('user_id', null).order('name'),
      insforge.database.from('categories').select('*').eq('user_id', userId).order('name'),
    ])
    if (e1) throw e1
    if (e2) throw e2
    return { success: true, data: [...(predefined ?? []), ...(userCats ?? [])] as Category[] }
  } catch {
    return { success: false, error: 'Error al cargar categorías' }
  }
}
