import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
} from '@/lib/actions/reminders.actions'
import { getCategories } from '@/lib/actions/categories.actions'
import { FormInput } from '@/components/ui/FormInput'
import { SelectModal } from '@/components/ui/SelectModal'
import { DateInput } from '@/components/ui/DateInput'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import type {
  Category,
  ReminderFrequency,
} from '@/types/database.types'

const FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'once', label: 'Una vez' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
]

const WEEKDAY_OPTIONS = [
  { label: 'Domingo', value: '0' },
  { label: 'Lunes', value: '1' },
  { label: 'Martes', value: '2' },
  { label: 'Miércoles', value: '3' },
  { label: 'Jueves', value: '4' },
  { label: 'Viernes', value: '5' },
  { label: 'Sábado', value: '6' },
]

const MONTH_OPTIONS = [
  { label: 'Enero', value: '1' },
  { label: 'Febrero', value: '2' },
  { label: 'Marzo', value: '3' },
  { label: 'Abril', value: '4' },
  { label: 'Mayo', value: '5' },
  { label: 'Junio', value: '6' },
  { label: 'Julio', value: '7' },
  { label: 'Agosto', value: '8' },
  { label: 'Septiembre', value: '9' },
  { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' },
  { label: 'Diciembre', value: '12' },
]

// Helper para generar días del mes 1-31
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
}))

export default function ReminderFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Form state
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<ReminderFrequency>('monthly')
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null)
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(null)
  const [monthOfYear, setMonthOfYear] = useState<number | null>(null)
  const [specificDate, setSpecificDate] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)

  // Modal toggles
  const [showFreqPicker, setShowFreqPicker] = useState(false)
  const [showDayWeekPicker, setShowDayWeekPicker] = useState(false)
  const [showDayMonthPicker, setShowDayMonthPicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    getCategories(user.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setCategories(res.data)
    })

    if (!isNew) {
      getReminderById(id, user.id).then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const r = res.data
          setDescription(r.description)
          setFrequency(r.frequency)
          setDayOfWeek(r.day_of_week)
          setDayOfMonth(r.day_of_month)
          setMonthOfYear(r.month_of_year)
          setSpecificDate(r.specific_date ?? '')
          setCategoryId(r.category_id ?? '')
          setIsActive(r.is_active)
        } else {
          toast.error(res.error ?? 'Recordatorio no encontrado')
          router.back()
        }
        setInitialLoading(false)
      })
    }

    return () => {
      cancelled = true
    }
  }, [user, id, isNew])

  function validate(): string | null {
    if (!description.trim()) return 'La descripción es requerida'
    if (frequency === 'once' && !specificDate) return 'Selecciona la fecha'
    if (frequency === 'weekly' && dayOfWeek === null) return 'Selecciona el día de la semana'
    if (frequency === 'monthly' && !dayOfMonth) return 'Selecciona el día del mes'
    if (frequency === 'yearly' && (!dayOfMonth || !monthOfYear)) return 'Selecciona mes y día'
    return null
  }

  async function handleSubmit() {
    if (!user) return
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSaving(true)

    // Solo enviamos los campos relevantes para la frequency — los demás van null
    const input = {
      description: description.trim(),
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : null,
      day_of_month: frequency === 'monthly' || frequency === 'yearly' ? dayOfMonth : null,
      month_of_year: frequency === 'yearly' ? monthOfYear : null,
      specific_date: frequency === 'once' ? specificDate : null,
      category_id: categoryId || null,
      is_active: isActive,
    }
    const result = isNew
      ? await createReminder(user.id, input)
      : await updateReminder(id, user.id, input)
    setSaving(false)

    if (result.success) {
      toast.success(isNew ? 'Recordatorio creado' : 'Recordatorio actualizado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
  }

  async function handleDelete() {
    if (!user || isNew) return
    const ok = await confirmDialog({
      title: 'Eliminar recordatorio',
      message: 'Se cancelará la notificación programada.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    setSaving(true)
    const result = await deleteReminder(id, user.id)
    setSaving(false)
    if (result.success) {
      toast.success('Recordatorio eliminado')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  const categoryOptions = [
    { label: 'Sin categoría', value: '' },
    ...categories.map((c) => ({
      label: `${c.icon ?? ''} ${c.name}`.trim(),
      value: c.id,
    })),
  ]
  const selectedCategory = categories.find((c) => c.id === categoryId)

  if (initialLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">
          {isNew ? 'Nuevo recordatorio' : 'Editar recordatorio'}
        </Text>
        {!isNew ? (
          <TouchableOpacity onPress={handleDelete} disabled={saving} activeOpacity={0.7}>
            <Text className="text-red-400 text-sm">Eliminar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <FormInput
            label="Descripción *"
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Pagar arriendo"
          />

          {/* Frequency */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Frecuencia *</Text>
            <TouchableOpacity
              onPress={() => setShowFreqPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className="text-white">
                {FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campos condicionales según frequency */}
          {frequency === 'once' ? (
            <DateInput
              label="Fecha *"
              value={specificDate}
              onChange={setSpecificDate}
              minimumDate={new Date()}
            />
          ) : null}

          {frequency === 'weekly' ? (
            <View className="mb-4">
              <Text className="text-muted text-sm mb-1">Día de la semana *</Text>
              <TouchableOpacity
                onPress={() => setShowDayWeekPicker(true)}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl px-4 py-3"
              >
                <Text className={dayOfWeek !== null ? 'text-white' : 'text-muted'}>
                  {dayOfWeek !== null
                    ? WEEKDAY_OPTIONS.find((o) => o.value === String(dayOfWeek))?.label
                    : 'Seleccionar día...'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {(frequency === 'monthly' || frequency === 'yearly') ? (
            <View className="mb-4">
              <Text className="text-muted text-sm mb-1">Día del mes *</Text>
              <TouchableOpacity
                onPress={() => setShowDayMonthPicker(true)}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl px-4 py-3"
              >
                <Text className={dayOfMonth ? 'text-white' : 'text-muted'}>
                  {dayOfMonth ? `Día ${dayOfMonth}` : 'Seleccionar día...'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {frequency === 'yearly' ? (
            <View className="mb-4">
              <Text className="text-muted text-sm mb-1">Mes *</Text>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(true)}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl px-4 py-3"
              >
                <Text className={monthOfYear ? 'text-white' : 'text-muted'}>
                  {monthOfYear
                    ? MONTH_OPTIONS.find((o) => o.value === String(monthOfYear))?.label
                    : 'Seleccionar mes...'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Categoría opcional */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Categoría (opcional)</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3"
            >
              <Text className={selectedCategory ? 'text-white' : 'text-muted'}>
                {selectedCategory
                  ? `${selectedCategory.icon ?? ''} ${selectedCategory.name}`.trim()
                  : 'Sin categoría'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* is_active toggle */}
          <View className="mb-6 bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center">
            <View className="flex-1">
              <Text className="text-white text-base">Activo</Text>
              <Text className="text-muted text-xs mt-0.5">
                Si lo desactivas, no recibirás la notificación
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#3f3f46', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          </View>

          <Text className="text-muted text-xs mb-4">
            🔔 Las notificaciones se disparan a las 9:00 AM hora local.
          </Text>

          <PrimaryButton
            onPress={handleSubmit}
            loading={saving}
            disabled={!description.trim()}
          >
            {isNew ? 'Crear recordatorio' : 'Guardar cambios'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <SelectModal
        visible={showFreqPicker}
        onClose={() => setShowFreqPicker(false)}
        title="Frecuencia"
        options={FREQUENCY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
        selected={frequency}
        onSelect={(v) => {
          setFrequency(v as ReminderFrequency)
          setShowFreqPicker(false)
        }}
      />
      <SelectModal
        visible={showDayWeekPicker}
        onClose={() => setShowDayWeekPicker(false)}
        title="Día de la semana"
        options={WEEKDAY_OPTIONS}
        selected={dayOfWeek !== null ? String(dayOfWeek) : ''}
        onSelect={(v) => {
          setDayOfWeek(parseInt(v, 10))
          setShowDayWeekPicker(false)
        }}
      />
      <SelectModal
        visible={showDayMonthPicker}
        onClose={() => setShowDayMonthPicker(false)}
        title="Día del mes"
        options={DAY_OPTIONS}
        selected={dayOfMonth ? String(dayOfMonth) : ''}
        onSelect={(v) => {
          setDayOfMonth(parseInt(v, 10))
          setShowDayMonthPicker(false)
        }}
      />
      <SelectModal
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        title="Mes"
        options={MONTH_OPTIONS}
        selected={monthOfYear ? String(monthOfYear) : ''}
        onSelect={(v) => {
          setMonthOfYear(parseInt(v, 10))
          setShowMonthPicker(false)
        }}
      />
      <SelectModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Categoría"
        options={categoryOptions}
        selected={categoryId}
        onSelect={(v) => {
          setCategoryId(v)
          setShowCategoryPicker(false)
        }}
      />
    </SafeAreaView>
  )
}
