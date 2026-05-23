import { insforge } from '@/lib/insforge'

/**
 * Actualiza el balance de una cuenta sumando o restando un monto,
 * convirtiendo monedas vía exchange rates cuando es necesario.
 *
 * Diferencia con el web: el web usa `insforgeAdmin` (admin client) porque
 * corre server-side. El nativo usa `insforge` (anon client). Funciona gracias
 * a las RLS policies de la tabla `accounts` (anon puede SELECT/UPDATE) y
 * `exchange_rates` (anon puede SELECT).
 *
 * @returns mensaje de error en caso de fallo, null en caso de éxito.
 */
export async function applyBalanceDelta(
  accountId: string,
  amount: number,
  transactionCurrency: string,
  direction: 'add' | 'subtract'
): Promise<string | null> {
  const { data: account, error: fetchError } = await insforge.database
    .from('accounts')
    .select('balance, currency')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) {
    return `balance-fetch-error: ${JSON.stringify(fetchError)}`
  }

  let amt = Number(amount)

  if (transactionCurrency !== account.currency) {
    const { data: rate } = await insforge.database
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', transactionCurrency)
      .eq('to_currency', account.currency)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (!rate) {
      return `no-exchange-rate from=${transactionCurrency} to=${account.currency}`
    }

    amt = amt * Number(rate.rate)
  }

  const newBalance = direction === 'add'
    ? Number(account.balance) + amt
    : Number(account.balance) - amt

  const { error: updateError } = await insforge.database
    .from('accounts')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', accountId)

  if (updateError) {
    return `balance-update-error: ${JSON.stringify(updateError)}`
  }

  return null
}
