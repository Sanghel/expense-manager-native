import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { convertCurrency } from '@/lib/actions/exchangeRates.actions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Currency } from '@/types/database.types'

const CURRENCIES: Currency[] = ['COP', 'USD', 'VES']

interface Props {
  amount: number
  fromCurrency: Currency
}

/**
 * Muestra el equivalente del `amount` en las **otras** monedas soportadas
 * (excluye la `fromCurrency`).
 *
 * Fetcha conversiones via `convertCurrency` (action que lee exchange_rates).
 * Si la rate no existe, `convertCurrency` devuelve el amount sin cambios
 * (degradación graceful — el componente sigue funcionando pero la cifra
 * no es real).
 *
 * Se oculta solo si amount <= 0 — evitamos parpadeo cuando el user borra
 * el input.
 */
export function CurrencyPreview({ amount, fromCurrency }: Props) {
  const [conversions, setConversions] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!amount || amount <= 0) {
      setConversions({})
      return
    }

    let cancelled = false
    const targets = CURRENCIES.filter((c) => c !== fromCurrency)

    Promise.all(
      targets.map(async (to) => {
        const converted = await convertCurrency(amount, fromCurrency, to)
        return [to, converted] as [Currency, number]
      })
    ).then((results) => {
      if (cancelled) return
      setConversions(Object.fromEntries(results))
    })

    return () => {
      cancelled = true
    }
  }, [amount, fromCurrency])

  if (!amount || amount <= 0 || Object.keys(conversions).length === 0) {
    return null
  }

  return (
    <View className="bg-surface border border-border rounded-xl px-3 py-2 mb-4">
      <Text className="text-muted text-xs mb-1">Equivalente aproximado</Text>
      <View className="flex-row flex-wrap gap-4">
        {Object.entries(conversions).map(([currency, value]) => (
          <Text key={currency} className="text-white text-sm">
            {formatCurrency(value, currency as Currency)}
          </Text>
        ))}
      </View>
    </View>
  )
}
