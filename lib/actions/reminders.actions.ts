import { insforge } from '@/lib/insforge'
import {
  createReminderSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type UpdateReminderInput,
} from '@/lib/validations/reminder'
import type { Reminder, ReminderWithCategory } from '@/types/database.types'
import {
  cancelReminderNotification,
  rescheduleReminderNotification,
  scheduleReminderNotification,
} from '@/lib/utils/notifications'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

export async function getReminders(
  userId: string
): Promise<Result<ReminderWithCategory[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('reminders')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: (data ?? []) as ReminderWithCategory[] }
  } catch {
    return { success: false, error: 'Error al cargar recordatorios' }
  }
}

export async function getReminderById(
  id: string,
  userId: string
): Promise<Result<ReminderWithCategory>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('reminders')
      .select('*, category:categories(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Recordatorio no encontrado' }
    return { success: true, data: data as ReminderWithCategory }
  } catch {
    return { success: false, error: 'Error al cargar recordatorio' }
  }
}

/**
 * Crea el reminder + programa la notification local.
 *
 * Acción multi-step ([[Acciones multi-step sin transacciones]]):
 *   1. Insert en DB (orden importante — sin row no hay deep-link válido).
 *   2. Schedule notification (con `data.reminderId` para deep-link).
 *
 * Si el schedule falla (permisos negados, OS limita, etc.), el reminder
 * queda creado pero sin notification. Degradación graceful.
 */
export async function createReminder(
  userId: string,
  input: CreateReminderInput
): Promise<Result<Reminder>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createReminderSchema.parse(input)
    const { data, error } = await insforge.database
      .from('reminders')
      .insert([{ ...validated, user_id: userId }])
      .select()
      .single()
    if (error) throw error

    const reminder = data as Reminder
    await scheduleReminderNotification(reminder)
    return { success: true, data: reminder }
  } catch {
    return { success: false, error: 'Error al crear recordatorio' }
  }
}

/**
 * Update + reschedule. Reschedule cancela la notification anterior
 * (buscando por reminderId en el data del payload) y crea una nueva con
 * la nueva config.
 */
export async function updateReminder(
  id: string,
  userId: string,
  input: UpdateReminderInput
): Promise<Result<Reminder>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = updateReminderSchema.parse(input)
    const { data, error } = await insforge.database
      .from('reminders')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error

    const reminder = data as Reminder
    await rescheduleReminderNotification(reminder)
    return { success: true, data: reminder }
  } catch {
    return { success: false, error: 'Error al actualizar recordatorio' }
  }
}

/**
 * Delete + cancel. Cancel busca por reminderId en el payload, no necesita
 * el `notificationId` persistido.
 */
export async function deleteReminder(
  id: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    await cancelReminderNotification(id)
    const { error } = await insforge.database
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar recordatorio' }
  }
}
