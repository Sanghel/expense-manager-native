// lib/utils/notifications.ts
//
// Wrapper sobre expo-notifications con la lógica específica del proyecto:
// permisos, scheduling de reminders, cancelación, listener handler.
//
// Convención del proyecto:
// - Toda notification se dispara a las 09:00 hora local del device.
//   (El schema de reminders no tiene campo `time` — default razonable.)
// - El payload incluye `{ data: { url: '/reminders/<id>' } }` para deep-link.
// - Se cachea el `notificationId` en la DB para poder cancelar/reprogramar
//   en updates/deletes.

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Reminder, ReminderFrequency } from '@/types/database.types'

// Hora fija de disparo. Configurable más adelante si se añade campo `time`.
const DEFAULT_HOUR = 9
const DEFAULT_MINUTE = 0

// Canal Android (obligatorio para que las notifications aparezcan en
// Android 8+). Lo creamos una sola vez al boot.
const ANDROID_CHANNEL_ID = 'reminders'

/**
 * Configurar el handler de notifications cuando la app está en foreground.
 * Por defecto expo-notifications NO muestra el banner si la app está abierta;
 * con esto forzamos que se vea siempre.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Crear el canal Android. Idempotente — se puede llamar varias veces sin
 * efecto. Llamar al boot (en root layout o al primer schedule).
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
  })
}

/**
 * Pedir permisos. iOS los pide solo la primera vez; sucesivas calls
 * devuelven el estado actual sin mostrar UI. Android 13+ requiere permiso
 * explícito desde POST_NOTIFICATIONS (auto-managed por expo).
 *
 * @returns true si los permisos están concedidos.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync()
  if (existing.granted) return true

  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  })
  return result.granted
}

/**
 * Construye el trigger calendar según la frequency del reminder.
 *
 * - once: dispara una vez en `specific_date` a las 9:00.
 * - weekly: cada semana en `day_of_week` a las 9:00.
 * - monthly: cada mes en `day_of_month` a las 9:00.
 * - yearly: cada año en `month_of_year`/`day_of_month` a las 9:00.
 *
 * Importante: expo-notifications usa **weekday 1-7 (Sunday=1)** en sus
 * triggers, mientras que JS Date.getDay() devuelve 0-6 (Sunday=0). Nosotros
 * almacenamos JS convention en `day_of_week` y convertimos al pasar.
 */
function buildTrigger(reminder: Reminder): Notifications.NotificationTriggerInput | null {
  const hour = DEFAULT_HOUR
  const minute = DEFAULT_MINUTE
  const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined

  switch (reminder.frequency) {
    case 'once': {
      if (!reminder.specific_date) return null
      const date = new Date(`${reminder.specific_date}T${pad(hour)}:${pad(minute)}:00`)
      if (date.getTime() <= Date.now()) return null // fecha pasada — no agendar
      return {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId,
      }
    }
    case 'weekly': {
      if (reminder.day_of_week === null || reminder.day_of_week === undefined) return null
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: reminder.day_of_week + 1, // JS 0-6 → expo 1-7
        hour,
        minute,
        channelId,
      }
    }
    case 'monthly': {
      if (!reminder.day_of_month) return null
      return {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: reminder.day_of_month,
        hour,
        minute,
        channelId,
      }
    }
    case 'yearly': {
      if (!reminder.day_of_month || !reminder.month_of_year) return null
      return {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: reminder.month_of_year - 1, // expo usa 0-11 para month en yearly
        day: reminder.day_of_month,
        hour,
        minute,
        channelId,
      }
    }
    default:
      return null
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Programa la notification local del reminder. Devuelve el `notificationId`
 * generado por el OS (informativo — para cancelar después usamos
 * `cancelReminderNotification(reminderId)` que busca por el `reminderId`
 * embedido en el payload, sin necesidad de persistirlo).
 *
 * Si el reminder está inactivo, o si el trigger no se puede construir (ej.
 * fecha en el pasado para `once`), no programa nada y devuelve null.
 */
export async function scheduleReminderNotification(
  reminder: Reminder
): Promise<string | null> {
  if (!reminder.is_active) return null

  const granted = await requestNotificationPermissions()
  if (!granted) return null

  await ensureAndroidChannel()

  const trigger = buildTrigger(reminder)
  if (!trigger) return null

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio',
      body: reminder.description,
      data: { url: `/reminders/${reminder.id}`, reminderId: reminder.id },
    },
    trigger,
  })
}

/**
 * Cancela todas las notifications programadas para un reminder dado.
 *
 * NO persistimos el `notificationId` en la DB — en su lugar embebimos el
 * `reminderId` en el `data` del payload al schedule. Al cancelar, listamos
 * todas las scheduled notifications, filtramos las que correspondan a este
 * reminder, y cancelamos.
 *
 * Trade-off:
 * - Pro: cero columnas nuevas en DB, cero AsyncStorage.
 * - Con: O(N) en cada cancel donde N = scheduled notifications. Para una
 *   app con <100 reminders esto es trivial.
 */
export async function cancelReminderNotification(reminderId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    const toCancel = scheduled.filter(
      (n) => (n.content.data as { reminderId?: string } | null)?.reminderId === reminderId
    )
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    )
  } catch {
    // Silencioso — best effort
  }
}

/**
 * Reprograma la notification: cancela la existente + programa una nueva.
 * Útil para updates de reminders (cambió la frequency, day_of_week, etc.).
 */
export async function rescheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  await cancelReminderNotification(reminder.id)
  return await scheduleReminderNotification(reminder)
}
