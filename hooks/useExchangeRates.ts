import { useEffect, useState } from 'react'
import { getAllRatePairs } from '@/lib/actions/exchangeRates.actions'
import type { ExchangeRate } from '@/types/database.types'

/**
 * Caché module-level compartida entre TODOS los callers del hook.
 * Las rates cambian 1x por día (cron en backend), suficiente cachearlas
 * durante la sesión. Refresh on next app launch.
 */
let cachedRates: ExchangeRate[] | null = null

/**
 * Hook que devuelve las exchange rates más recientes con caché en memoria.
 * Primera llamada fetchea; siguientes (en el mismo session) usan caché.
 *
 * @example
 * const { rates, loading } = useExchangeRates()
 * const usdToCop = rates.find(r => r.from_currency === 'USD' && r.to_currency === 'COP')
 */
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>(cachedRates ?? [])
  const [loading, setLoading] = useState(cachedRates === null)

  useEffect(() => {
    if (cachedRates !== null) return // hit de caché — no refetch

    let cancelled = false

    getAllRatePairs().then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        cachedRates = result.data
        setRates(result.data)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { rates, loading }
}

/**
 * Invalida la caché module-level. Llamar después de un sync manual
 * de rates o al detectar que el día cambió.
 */
export function invalidateExchangeRatesCache() {
  cachedRates = null
}
