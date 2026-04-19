// lib/actions/accounts.actions.ts (stub — replaced in Task 5)
import type { Account } from '@/types/database.types'

export async function getAccounts(_userId: string): Promise<{ success: boolean; data?: Account[] }> {
  return { success: true, data: [] }
}
