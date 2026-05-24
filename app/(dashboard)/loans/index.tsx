import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getLoans } from '@/lib/actions/loans.actions'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils/currency'
import type { LoanWithAccount } from '@/types/database.types'

type Section = {
  title: string
  data: LoanWithAccount[]
}

export default function LoansScreen() {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanWithAccount[]>([])
  const [loading, setLoading] = useState(true)

  const loadLoans = useCallback(async () => {
    if (!user) return
    const res = await getLoans(user.id)
    if (res.success && res.data) setLoans(res.data)
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadLoans()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadLoans])
  )

  const sections: Section[] = useMemo(() => {
    const lent = loans.filter((l) => l.type === 'lent' && l.status === 'active')
    const borrowed = loans.filter(
      (l) => l.type === 'borrowed' && l.status === 'active'
    )
    const settled = loans.filter((l) => l.status === 'settled')
    const out: Section[] = []
    if (lent.length) out.push({ title: 'Por cobrar', data: lent })
    if (borrowed.length) out.push({ title: 'Por pagar', data: borrowed })
    if (settled.length) out.push({ title: 'Saldados', data: settled })
    return out
  }, [loans])

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Préstamos</Text>
        <View style={{ width: 60 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          sections.length === 0 ? { flex: 1 } : { paddingVertical: 12 }
        }
        ListEmptyComponent={
          <EmptyState
            icon="🤝"
            title="Sin préstamos"
            description="Toca + para registrar tu primer préstamo o deuda"
          />
        }
        renderSectionHeader={({ section }) => (
          <View className="px-4 pt-4 pb-2">
            <Text className="text-muted text-xs uppercase tracking-wider">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => <LoanCard loan={item} />}
        stickySectionHeadersEnabled={false}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/loans/new')}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text className="text-white text-3xl font-bold" style={{ lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function LoanCard({ loan }: { loan: LoanWithAccount }) {
  const amount = Number(loan.amount)
  const paid = Number(loan.paid_amount)
  const ratio = amount > 0 ? paid / amount : 0
  const remaining = Math.max(0, amount - paid)
  const settled = loan.status === 'settled'
  const isLent = loan.type === 'lent'

  return (
    <TouchableOpacity
      onPress={() => router.push(`/loans/${loan.id}`)}
      activeOpacity={0.7}
      className="mx-4 mb-3 bg-surface border border-border rounded-2xl p-4"
    >
      <View className="flex-row items-center mb-2">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isLent ? 'bg-green-500/15' : 'bg-amber-500/15'
          }`}
        >
          <Text className="text-xl">{isLent ? '⬇️' : '⬆️'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            {loan.person_name}
          </Text>
          <Text className="text-muted text-xs">
            {isLent ? 'Le presté' : 'Me prestó'}{' '}
            {loan.account ? `· ${loan.account.name}` : ''}
          </Text>
        </View>
        <Text
          className={
            settled
              ? 'text-green-400 text-xs font-semibold'
              : 'text-muted text-xs'
          }
        >
          {settled ? 'Saldado' : `${Math.round(ratio * 100)}%`}
        </Text>
      </View>

      {!settled ? <ProgressBar value={ratio} color="#10b981" /> : null}

      <View className="flex-row justify-between mt-3">
        <Text className="text-muted text-xs">
          {settled ? 'Total ' : 'Pagado '}
          <Text className="text-white text-sm">
            {formatCurrency(settled ? amount : paid, loan.currency)}
          </Text>
        </Text>
        <Text className="text-muted text-xs">
          {settled ? '' : 'Saldo '}
          <Text className="text-white text-sm">
            {settled
              ? formatCurrency(amount, loan.currency)
              : formatCurrency(remaining, loan.currency)}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  )
}
