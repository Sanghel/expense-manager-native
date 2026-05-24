// app/(dashboard)/quick-actions.tsx
//
// Ruta dummy — nunca se renderiza en práctica. El tabPress del tab "Crear"
// se intercepta en _layout.tsx con e.preventDefault() y abre el
// QuickActionsSheet en su lugar. expo-router exige que el tab apunte a una
// ruta válida; esta vive solo para satisfacer ese requisito.
//
// Ver: 30 - Patterns/Tab-intercepted modal sheet.md
import { View } from 'react-native'

export default function QuickActionsPlaceholder() {
  return <View className="flex-1 bg-bg" />
}
