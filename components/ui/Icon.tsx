import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Menu,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Plus,
  ChevronRight,
  X,
  Check,
  Trash2,
  Pencil,
  Search,
  Settings,
  BarChart3,
  Target,
  PiggyBank,
  HandCoins,
  FolderTree,
  Bell,
} from 'lucide-react-native'

/**
 * Wrapper sobre lucide-react-native. Centraliza el set de iconos usados en la app.
 *
 * Para añadir un icono nuevo:
 * 1. Import desde 'lucide-react-native' arriba
 * 2. Añadir al map `ICONS` con un nombre kebab-case descriptivo
 * 3. Usar como `<Icon name="..." />` desde cualquier componente
 *
 * Catálogo completo de iconos: https://lucide.dev/icons/
 */
const ICONS = {
  dashboard: LayoutDashboard,
  transactions: ArrowLeftRight,
  wallet: Wallet,
  menu: Menu,
  'arrow-down-circle': ArrowDownCircle,
  'arrow-up-circle': ArrowUpCircle,
  repeat: Repeat,
  plus: Plus,
  'chevron-right': ChevronRight,
  x: X,
  check: Check,
  trash: Trash2,
  edit: Pencil,
  search: Search,
  settings: Settings,
  chart: BarChart3,
  target: Target,
  piggy: PiggyBank,
  'hand-coins': HandCoins,
  'folder-tree': FolderTree,
  bell: Bell,
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function Icon({
  name,
  size = 20,
  color = '#ffffff',
  strokeWidth = 2,
}: IconProps) {
  const Component = ICONS[name]
  return <Component size={size} color={color} strokeWidth={strokeWidth} />
}
