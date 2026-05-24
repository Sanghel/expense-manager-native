import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getTransactions,
  deleteTransaction,
} from '@/lib/actions/transactions.actions'
import { getCategories } from '@/lib/actions/categories.actions'
import { getAccounts } from '@/lib/actions/accounts.actions'
import { TransactionCard } from '@/components/transactions/TransactionCard'
import { Icon } from '@/components/ui/Icon'
import { SelectModal } from '@/components/ui/SelectModal'
import { useDebounce } from '@/hooks/useDebounce'
import type {
  TransactionWithCategory,
  TransactionType,
  Category,
  Account,
} from '@/types/database.types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type TypeFilter = TransactionType | 'all'

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Ingresos', value: 'income' },
  { label: 'Gastos', value: 'expense' },
]

const TYPE_LABEL_BY_VALUE: Record<TypeFilter, string> = {
  all: 'Todos',
  income: 'Ingreso',
  expense: 'Gasto',
}

/** Genera últimos 12 meses como opciones YYYY-MM con labels en español. */
function getMonthOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const raw = d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
    const label = raw.charAt(0).toUpperCase() + raw.slice(1)
    opts.push({ label, value })
  }
  return opts
}

export default function TransactionsScreen() {
  const { user } = useAuth()

  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // Filtros
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(null)

  // Modales de filtros
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showMonthModal, setShowMonthModal] = useState(false)

  // Opciones que vienen del backend
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const loadingMoreRef = useRef(false)

  // Cargar categorías y cuentas para los pickers (una sola vez)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([getCategories(user.id), getAccounts(user.id)]).then(
      ([catsRes, accsRes]) => {
        if (cancelled) return
        if (catsRes.success && catsRes.data) setCategories(catsRes.data)
        if (accsRes.success && accsRes.data) setAccounts(accsRes.data)
      }
    )
    return () => {
      cancelled = true
    }
  }, [user])

  const loadPage = useCallback(
    async (pageNum: number, mode: 'reset' | 'append') => {
      if (!user) return
      if (mode === 'append') {
        if (loadingMoreRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      const result = await getTransactions(
        user.id,
        {
          search: debouncedSearch,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          categoryId: categoryFilter ?? undefined,
          accountId: accountFilter ?? undefined,
          month: monthFilter ?? undefined,
        },
        { page: pageNum, pageSize: PAGE_SIZE }
      )

      if (result.success && result.data) {
        if (mode === 'reset') {
          setTransactions(result.data.items)
        } else {
          setTransactions((prev) => [...prev, ...result.data!.items])
        }
        setHasMore(result.data.hasMore)
        setPage(pageNum)
      }

      if (mode === 'append') {
        loadingMoreRef.current = false
        setLoadingMore(false)
      } else {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user, debouncedSearch, typeFilter, categoryFilter, accountFilter, monthFilter]
  )

  useFocusEffect(
    useCallback(() => {
      loadPage(1, 'reset')
    }, [loadPage])
  )

  function handleRefresh() {
    setRefreshing(true)
    loadPage(1, 'reset')
  }

  function handleEndReached() {
    if (!hasMore || loading) return
    loadPage(page + 1, 'append')
  }

  async function handleDelete(id: string) {
    if (!user) return
    const result = await deleteTransaction(id, user.id)
    if (result.success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
  }

  // Opciones derivadas
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const categoryOptions = useMemo(
    () => [
      { label: 'Todas', value: '' },
      ...categories.map((c) => ({
        label: `${c.icon ?? ''} ${c.name}`.trim(),
        value: c.id,
      })),
    ],
    [categories]
  )
  const accountOptions = useMemo(
    () => [
      { label: 'Todas', value: '' },
      ...accounts.map((a) => ({
        label: `${a.icon ?? '💳'} ${a.name}`,
        value: a.id,
      })),
    ],
    [accounts]
  )
  const monthOptionsWithAll = useMemo(
    () => [{ label: 'Todos los meses', value: '' }, ...monthOptions],
    [monthOptions]
  )

  // Labels para chips
  const categoryLabel = categoryFilter
    ? categories.find((c) => c.id === categoryFilter)?.name ?? 'Todas'
    : 'Todas'
  const accountLabel = accountFilter
    ? accounts.find((a) => a.id === accountFilter)?.name ?? 'Todas'
    : 'Todas'
  const monthLabel = monthFilter
    ? monthOptions.find((m) => m.value === monthFilter)?.label ?? 'Todos'
    : 'Todos'

  const anyFilterActive =
    typeFilter !== 'all' || categoryFilter || accountFilter || monthFilter

  function clearAllFilters() {
    setTypeFilter('all')
    setCategoryFilter(null)
    setAccountFilter(null)
    setMonthFilter(null)
  }

  function renderFooter() {
    if (!loadingMore) return null
    return (
      <View className="py-4">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Transacciones</Text>
      </View>

      {/* Search bar */}
      <View className="mx-4 mt-3 mb-2 flex-row items-center bg-surface rounded-xl px-3 py-2">
        <Icon name="search" size={18} color="#B0B0B0" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por descripción..."
          placeholderTextColor="#6b7280"
          className="flex-1 ml-2 text-white"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearch('')}
            activeOpacity={0.6}
            className="p-1"
          >
            <Icon name="x" size={16} color="#B0B0B0" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View className="flex-row flex-wrap px-4 pb-2 gap-2">
        <FilterChip
          label="Tipo"
          value={TYPE_LABEL_BY_VALUE[typeFilter]}
          active={typeFilter !== 'all'}
          onPress={() => setShowTypeModal(true)}
        />
        <FilterChip
          label="Categoría"
          value={categoryLabel}
          active={!!categoryFilter}
          onPress={() => setShowCategoryModal(true)}
        />
        <FilterChip
          label="Cuenta"
          value={accountLabel}
          active={!!accountFilter}
          onPress={() => setShowAccountModal(true)}
        />
        <FilterChip
          label="Mes"
          value={monthLabel}
          active={!!monthFilter}
          onPress={() => setShowMonthModal(true)}
        />
        {anyFilterActive ? (
          <TouchableOpacity
            onPress={clearAllFilters}
            activeOpacity={0.6}
            className="flex-row items-center px-3 py-2 rounded-full border border-red-500/50"
          >
            <Icon name="x" size={14} color="#f87171" />
            <Text className="text-red-400 text-sm ml-1">Limpiar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              onPress={() => router.push(`/(dashboard)/transactions/${item.id}`)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4F46E5"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-muted text-base">
                {anyFilterActive || debouncedSearch
                  ? 'Sin resultados'
                  : 'No hay transacciones'}
              </Text>
              <Text className="text-muted text-sm mt-1">
                {anyFilterActive || debouncedSearch
                  ? 'Ajustá los filtros o limpiálos'
                  : 'Toca + para crear una'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(dashboard)/transactions/new')}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl leading-none">+</Text>
      </TouchableOpacity>

      {/* Modales de filtros */}
      <SelectModal
        visible={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Filtrar por tipo"
        options={TYPE_OPTIONS}
        selected={typeFilter}
        onSelect={(v) => {
          setTypeFilter(v as TypeFilter)
          setShowTypeModal(false)
        }}
      />
      <SelectModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Filtrar por categoría"
        options={categoryOptions}
        selected={categoryFilter ?? ''}
        onSelect={(v) => {
          setCategoryFilter(v || null)
          setShowCategoryModal(false)
        }}
      />
      <SelectModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Filtrar por cuenta"
        options={accountOptions}
        selected={accountFilter ?? ''}
        onSelect={(v) => {
          setAccountFilter(v || null)
          setShowAccountModal(false)
        }}
      />
      <SelectModal
        visible={showMonthModal}
        onClose={() => setShowMonthModal(false)}
        title="Filtrar por mes"
        options={monthOptionsWithAll}
        selected={monthFilter ?? ''}
        onSelect={(v) => {
          setMonthFilter(v || null)
          setShowMonthModal(false)
        }}
      />
    </SafeAreaView>
  )
}

interface FilterChipProps {
  label: string
  value: string
  active: boolean
  onPress: () => void
}

function FilterChip({ label, value, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center px-3 py-2 rounded-full border ${
        active ? 'bg-primary/20 border-primary' : 'bg-surface border-border'
      }`}
    >
      {active ? (
        <>
          <Text className="text-xs text-primary">{label}:</Text>
          <Text className="text-sm font-medium ml-1 text-white">{value}</Text>
        </>
      ) : (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      )}
    </TouchableOpacity>
  )
}
