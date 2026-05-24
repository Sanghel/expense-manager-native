import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import {
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/categories.actions'
import { FormInput } from '@/components/ui/FormInput'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { IconPicker } from '@/components/ui/IconPicker'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { CategoryType } from '@/types/database.types'

const TYPE_OPTIONS: { value: CategoryType; label: string; icon: IconName }[] = [
  { value: 'expense', label: 'Gasto', icon: 'arrow-down-circle' },
  { value: 'income', label: 'Ingreso', icon: 'arrow-up-circle' },
  { value: 'both', label: 'Ambos', icon: 'repeat' },
]

export default function CategoryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [initialLoading, setInitialLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)

  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  useEffect(() => {
    if (isNew || !user) return

    let cancelled = false
    getCategoryById(id, user.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setName(res.data.name)
        setType(res.data.type)
        setIcon(res.data.icon)
        setColor(res.data.color)
      } else {
        toast.error(res.error ?? 'Categoría no encontrada')
        router.back()
      }
      setInitialLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id, user, isNew])

  async function handleSubmit() {
    if (!user || !name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    const input = {
      name: name.trim(),
      type,
      icon,
      color,
    }
    const result = isNew
      ? await createCategory(user.id, input)
      : await updateCategory(id, user.id, input)

    setSaving(false)
    if (result.success) {
      toast.success(isNew ? 'Categoría creada' : 'Categoría actualizada')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
  }

  async function handleDelete() {
    if (!user || isNew) return

    const ok = await confirmDialog({
      title: 'Eliminar categoría',
      message: 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return

    setSaving(true)
    const result = await deleteCategory(id, user.id)
    setSaving(false)
    if (result.success) {
      toast.success('Categoría eliminada')
      router.back()
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

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
          {isNew ? 'Nueva categoría' : 'Editar categoría'}
        </Text>
        {!isNew ? (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={saving}
            activeOpacity={0.7}
          >
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
            label="Nombre *"
            value={name}
            onChangeText={setName}
            placeholder="Ej: Mercado"
          />

          {/* Tipo */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Tipo</Text>
            <View className="flex-row gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setType(opt.value)}
                  activeOpacity={0.7}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    type === opt.value
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Icon name={opt.icon} size={18} color="white" />
                    <Text className="text-white font-medium">{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Icon picker trigger */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Icono</Text>
            <TouchableOpacity
              onPress={() => setShowIconPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-2xl">{icon ?? '📂'}</Text>
              <Text className="text-muted text-sm">Cambiar</Text>
            </TouchableOpacity>
          </View>

          {/* Color picker trigger */}
          <View className="mb-4">
            <Text className="text-muted text-sm mb-1">Color</Text>
            <TouchableOpacity
              onPress={() => setShowColorPicker(true)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <View
                style={{ backgroundColor: color ?? '#4F46E5' }}
                className="w-10 h-10 rounded-full"
              />
              <Text className="text-muted text-sm">Cambiar</Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            onPress={handleSubmit}
            loading={saving}
            disabled={!name.trim()}
          >
            {isNew ? 'Crear categoría' : 'Guardar cambios'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers fuera del ScrollView (son Modales) */}
      <IconPicker
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        selected={icon ?? undefined}
        onSelect={setIcon}
      />
      <ColorPicker
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        selected={color ?? undefined}
        onSelect={setColor}
      />
    </SafeAreaView>
  )
}
