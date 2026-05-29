import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Icon, type IconName } from '@/components/ui/Icon'
import { toast } from '@/components/ui/Toast'

interface QuickActionsSheetProps {
  visible: boolean
  onClose: () => void
}

interface ActionTile {
  icon: IconName
  label: string
  /** Si está disponible, se navega a esta ruta al tap. */
  route?: string
  /** Si no hay ruta, este mensaje se muestra como toast. */
  comingSoon?: string
  /** Color del badge del icono. */
  color: string
}

/**
 * Tiles del menú principal. Mezcla de **accesos directos** (Transacción nueva,
 * único shortcut a creación porque es la acción más frecuente) y **navegación
 * a listados** (el resto — para ver, gestionar o crear desde su pantalla).
 *
 * No incluimos Transacciones como listado porque ya es un tab del bottom bar.
 */
const TILES: ActionTile[] = [
  {
    icon: 'plus',
    label: 'Nueva transacción',
    route: '/transactions/new',
    color: '#4F46E5',
  },
  {
    icon: 'sparkles',
    label: 'Chat IA',
    route: '/chat',
    color: '#a855f7',
  },
  {
    icon: 'wallet',
    label: 'Cuentas',
    route: '/accounts',
    color: '#0ea5e9',
  },
  {
    icon: 'folder-tree',
    label: 'Categorías',
    route: '/categories',
    color: '#06b6d4',
  },
  {
    icon: 'target',
    label: 'Planificación',
    route: '/planning',
    color: '#f59e0b',
  },
  {
    icon: 'hand-coins',
    label: 'Préstamos',
    route: '/loans',
    color: '#a855f7',
  },
  {
    icon: 'bell',
    label: 'Recordatorios',
    route: '/reminders',
    color: '#ec4899',
  },
]

/**
 * Bottom sheet de acciones rápidas — grid 2 columnas de tiles + un row
 * full-width al final para "Configuración y perfil".
 *
 * Cada tile cierra el sheet y navega a la ruta de creación. El item de
 * Recordatorios todavía no existe (T-5.3) — muestra un toast informativo.
 */
export function QuickActionsSheet({ visible, onClose }: QuickActionsSheetProps) {
  function handleTilePress(tile: ActionTile) {
    onClose()
    if (tile.route) {
      // Pequeño delay para que cierre la animación antes de navegar.
      setTimeout(() => router.push(tile.route!), 250)
    } else if (tile.comingSoon) {
      setTimeout(() => toast(tile.comingSoon!), 250)
    }
  }

  function handleProfilePress() {
    onClose()
    setTimeout(() => router.push('/profile'), 250)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={75}>
      <Text className="text-white text-lg font-bold mb-1">Menú principal</Text>
      <Text className="text-muted text-xs mb-4">
        Accesos rápidos y secciones de tu app
      </Text>

      {/* Grid 2 col de tiles */}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {TILES.map((tile) => (
          <View key={tile.label} className="w-1/2 p-1">
            <TouchableOpacity
              onPress={() => handleTilePress(tile)}
              activeOpacity={0.7}
              className="bg-bg border border-border rounded-2xl p-4 items-center"
            >
              <View
                style={{ backgroundColor: `${tile.color}22` }}
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
              >
                <Icon name={tile.icon} color={tile.color} size={22} />
              </View>
              <Text className="text-white text-sm font-medium">
                {tile.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Separador */}
      <View className="h-px bg-border my-4" />

      {/* Profile — full width */}
      <TouchableOpacity
        onPress={handleProfilePress}
        activeOpacity={0.7}
        className="bg-bg border border-border rounded-2xl px-4 py-3 flex-row items-center"
      >
        <View
          style={{ backgroundColor: '#6b728022' }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Icon name="settings" color="#9ca3af" size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-medium">
            Configuración y perfil
          </Text>
          <Text className="text-muted text-xs">
            Preferencias, cuenta, datos
          </Text>
        </View>
        <Icon name="chevron-right" color="#6b7280" size={18} />
      </TouchableOpacity>
    </BottomSheet>
  )
}
