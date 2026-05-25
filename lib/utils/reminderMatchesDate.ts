import type { Reminder } from '@/types/database.types'

/**
 * Devuelve true si el reminder dispara en la fecha dada.
 *
 * Para cada frequency hace el matching correspondiente:
 *   - once: date == specific_date exacto
 *   - weekly: date.getDay() == day_of_week (JS convention 0-6, Sunday=0)
 *   - monthly: date.getDate() == day_of_month
 *   - yearly: date.getMonth()+1 == month_of_year AND date.getDate() == day_of_month
 *
 * No mira `is_active` — el caller decide si filtrar inactivos antes.
 */
export function reminderMatchesDate(reminder: Reminder, date: Date): boolean {
  switch (reminder.frequency) {
    case 'once': {
      if (!reminder.specific_date) return false
      const iso = date.toISOString().slice(0, 10)
      return iso === reminder.specific_date
    }
    case 'weekly':
      return reminder.day_of_week === date.getDay()
    case 'monthly':
      return reminder.day_of_month === date.getDate()
    case 'yearly':
      return (
        reminder.month_of_year === date.getMonth() + 1 &&
        reminder.day_of_month === date.getDate()
      )
    default:
      return false
  }
}

/**
 * Helper utilitario: convierte 'YYYY-MM-DD' (formato de react-native-calendars
 * para días) en Date local sin time zone shift.
 */
export function parseDateString(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}
