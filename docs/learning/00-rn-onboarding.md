# 00 — Onboarding a React Native (para devs que vienen de React web)

Esta es tu base teórica antes de empezar la migración. Léelo con calma — la idea no es memorizarlo, sino tener un mapa mental claro de **qué cosas se parecen a React web y qué cosas son distintas**. Volverás a este doc cuando aparezcan los conceptos en tareas concretas.

> **Cómo está organizado este folder:** `00-rn-onboarding.md` es la base. Luego habrá un `T-X.X.md` por cada tarea con los conceptos específicos de esa tarea. Y un `index.md` que va creciendo como tu mapa-resumen.

---

## 1. La gran diferencia: NO hay DOM

En React web tú escribes JSX que se convierte en HTML. El browser renderiza el HTML en su DOM.

En React Native escribes JSX que se convierte en **componentes nativos** (UIView en iOS, View en Android). **No hay HTML, no hay CSS, no hay browser**.

Esto suena fuerte pero en práctica significa tres cosas:

1. **No puedes usar elementos HTML.** Nada de `<div>`, `<span>`, `<button>`, `<input>`, `<img>`. Existen sus equivalentes RN:

| Web (HTML)          | React Native                              |
| ------------------- | ----------------------------------------- |
| `<div>`             | `<View>`                                  |
| `<span>` / texto    | `<Text>` (obligatorio para CUALQUIER string visible) |
| `<button>`          | `<Pressable>` o `<TouchableOpacity>`      |
| `<input type=text>` | `<TextInput>`                             |
| `<img>`             | `<Image>` / `<ImageBackground>`           |
| `<ul>` con scroll   | `<ScrollView>` o `<FlatList>` (preferido) |
| `<a>` / navegación  | `<Link>` o `router.push()` (expo-router)  |

2. **Cualquier texto visible debe estar dentro de `<Text>`.** Esto es la fuente #1 de errores al empezar:

```tsx
// ❌ NO funciona en RN
<View>Hola mundo</View>

// ✅ Sí funciona
<View><Text>Hola mundo</Text></View>
```

3. **El "CSS" se aplica como objetos JS.** No hay archivos `.css` ni cascada. En este proyecto usamos **NativeWind** (Tailwind compilado a `style` props), así que la sintaxis se siente igual que web, pero **no todas las utilidades de Tailwind existen** (ver sección 4).

---

## 2. El stack de este proyecto

| Capa              | Tecnología              | Equivalente web                      |
| ----------------- | ----------------------- | ------------------------------------ |
| Runtime           | React Native 0.81       | React DOM                            |
| Wrapper/toolchain | Expo 54 (SDK gestionado)| Next.js (toolchain integrada)        |
| Routing           | expo-router 6           | Next.js App Router                   |
| Lenguaje          | TypeScript estricto     | igual                                |
| Estilos           | NativeWind 4 (Tailwind) | Tailwind                             |
| Estado server     | InsForge SDK            | igual (compartido con el repo web)   |
| Auth              | expo-auth-session + Google | NextAuth + Google                 |
| Storage seguro    | expo-secure-store       | cookies httpOnly / localStorage      |
| Forms             | sin librería; `useState` + Zod | igual                          |

**Expo** es lo que en web sería **Next.js**: una toolchain que te oculta config molesta (Metro bundler, builds nativos, polyfills, etc.) y te da APIs nativas listas para usar (notifications, secure-store, auth-session…).

---

## 3. expo-router: routing por archivos (parecido a Next App Router, con matices)

Si conoces App Router de Next.js, esto te resultará familiar:

- Cada archivo `.tsx` en `app/` es una ruta.
- `_layout.tsx` envuelve a sus hermanos y descendientes (como `layout.tsx` en Next).
- `(group)` en un nombre de carpeta = **grupo de rutas que comparte layout pero NO añade segmento a la URL** (igual que Next).
- `[id].tsx` = ruta dinámica con parámetro `id`.
- `index.tsx` = ruta raíz del segmento.

**Estructura actual del repo native:**

```
app/
├── _layout.tsx                 # Layout raíz: AuthProvider, fonts, etc.
├── (auth)/
│   ├── _layout.tsx             # Stack para flujo de auth
│   └── login.tsx               # /login
└── (dashboard)/
    ├── _layout.tsx             # Tabs (Dashboard / Transactions / Accounts / More)
    ├── index.tsx               # tab inicial (dashboard stub)
    ├── more.tsx                # tab "más"
    ├── transactions/
    │   ├── _layout.tsx         # Stack interno (lista + detalle)
    │   ├── index.tsx           # /transactions
    │   └── [id].tsx            # /transactions/:id
    └── accounts/
        ├── _layout.tsx
        ├── index.tsx
        └── [id].tsx
```

### Diferencias importantes vs Next.js

- **Navegación es stack, no historial del browser.** Cuando haces `router.push('/foo')` se *apila* la pantalla. El back físico/gesto saca la última. No hay URL bar, no hay "atrás del navegador" — el stack ES el historial.
- **Layouts pueden ser `Stack`, `Tabs` o `Drawer`** (de la lib `expo-router`). Cada uno renderiza sus hijos de forma distinta. Tu `app/(dashboard)/_layout.tsx` usa `<Tabs>` para la barra inferior.
- **No hay Server Components ni Server Actions.** Todo es cliente. Los "actions" del web (server actions de Next) aquí son funciones normales que llaman al backend (InsForge) directamente.
- **`useLocalSearchParams()`** sustituye a `useSearchParams()` de Next para leer params de la URL.

### APIs clave de expo-router

```tsx
import { router, Link, useLocalSearchParams } from 'expo-router'

// Navegar imperativo
router.push('/transactions')           // apila
router.replace('/login')               // reemplaza
router.back()                          // pop

// Navegar declarativo
<Link href="/transactions">Ver</Link>

// Leer params
const { id } = useLocalSearchParams<{ id: string }>()
```

---

## 4. NativeWind: Tailwind para RN (con asteriscos)

Este proyecto usa **NativeWind v4** — escribes `className="flex-1 bg-bg p-4"` y se compila a un objeto `style` en runtime.

**Lo bueno:** sintaxis idéntica a Tailwind web. La mayoría de utilities funcionan.

**Lo que NO existe (no se traduce a RN):**

- ❌ `hover:` (no hay puntero en móvil) — usa `active:` en `Pressable`.
- ❌ `cursor-*` (sin sentido).
- ❌ `sm:` / `md:` / `lg:` breakpoints — el layout responsivo en RN se hace con `Dimensions`, `useWindowDimensions()` o porcentajes.
- ❌ `grid` y muchas utilities CSS Grid — solo hay **Flexbox**, y por defecto `flex-direction: column` (al revés que CSS).
- ❌ Pseudo-clases CSS (`:first-child`, `:nth-child`, etc.).
- ❌ Animaciones CSS (`animate-spin`, transitions): usa `react-native-reanimated`.

**Layout por defecto distinto a CSS:**
- `flex-direction: column` por defecto (CSS es `row`).
- `align-items: stretch` por defecto.
- `position: relative` por defecto (CSS es `static`).
- Cada `View` es un nuevo flex container — no hay block/inline.

Tip: cuando algo no se vea como esperás, **invierte tu intuición de CSS**: la mayoría de defaults son al revés.

### Estilos en línea vs StyleSheet vs NativeWind

Las 3 formas conviven:

```tsx
// 1. NativeWind (lo más usado en este proyecto)
<View className="flex-1 bg-bg p-4" />

// 2. Style inline
<View style={{ flex: 1, backgroundColor: '#0f0f13', padding: 16 }} />

// 3. StyleSheet (recomendado RN nativo)
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } })
<View style={styles.container} />
```

**Regla del proyecto:** usa NativeWind por defecto. Cae a `style={{...}}` solo para valores dinámicos (ej. `style={{ height: animatedHeight }}`).

---

## 5. Safe areas, status bar, teclado

En web no piensas en el notch del iPhone ni en la barra de estado. En RN sí.

- **`SafeAreaView`** (o `useSafeAreaInsets()` de `react-native-safe-area-context`): respeta el notch, el home indicator, la barra de estado.
- **`StatusBar`** (de `expo-status-bar`): controla el color del texto de la barra de estado del sistema.
- **`KeyboardAvoidingView`**: cuando aparece el teclado, evita que tape inputs. Comportamiento distinto en iOS (`padding`) y Android (`height`). Verás esto en formularios.

Ejemplo típico (lo encontrarás en muchas pantallas de la migración):

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAvoidingView, Platform } from 'react-native'

<SafeAreaView edges={['top']} className="flex-1 bg-bg">
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    className="flex-1"
  >
    {/* contenido */}
  </KeyboardAvoidingView>
</SafeAreaView>
```

---

## 6. Listas: SIEMPRE FlatList, casi nunca `.map()`

En web pintas listas con `.map()` sin pensar — el browser virtualiza por ti. **En RN, una lista larga con `.map()` se cae**: renderiza todos los items aunque no se vean.

- **`FlatList`**: virtualiza, solo renderiza los items visibles. Es el `<ul>` que debiste usar siempre.
- **`SectionList`**: igual pero con secciones agrupadas.
- **`ScrollView`**: para pantallas con contenido scrollable corto (formularios, detalles). NO para listas dinámicas largas.

Mira [components/transactions/TransactionCard.tsx](../../components/transactions/TransactionCard.tsx) consumido en [app/(dashboard)/transactions/index.tsx](../../app/(dashboard)/transactions/index.tsx) — ahí ya hay un `FlatList` que servirá de ejemplo.

Props clave:

```tsx
<FlatList
  data={transactions}                       // array
  keyExtractor={(item) => item.id}          // OBLIGATORIO (como key en React)
  renderItem={({ item }) => <Card x={item}/>}// función pura
  onRefresh={refetch}                       // pull-to-refresh
  refreshing={loading}                      // estado del refresh
  onEndReached={loadMore}                   // infinite scroll
  ListEmptyComponent={<Empty />}            // estado vacío
  ItemSeparatorComponent={Sep}              // separador
/>
```

---

## 7. Interacción: Pressable y Touchables

No hay `onClick`. Lo equivalente:

- **`Pressable`**: el moderno, recomendado. Acepta `onPress`, `onLongPress`, y un callback `style/className` que recibe `{ pressed: boolean }`.
- **`TouchableOpacity`**: clásico, baja la opacidad al tocar.
- **`TouchableHighlight`**: cambia el fondo.

Para los CTAs y filas de listas usaremos **`Pressable`** mayoritariamente.

```tsx
<Pressable
  onPress={handlePress}
  className="px-4 py-3 rounded-xl active:opacity-70"
>
  <Text className="text-white">Tocar</Text>
</Pressable>
```

---

## 8. Lifecycle, navegación, foco

- `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef` → **idénticos** a React web.
- **`useFocusEffect`** (de `expo-router`): corre cuando la pantalla **entra en foco**. Importante: en RN las pantallas en el stack **no se desmontan** — quedan vivas debajo. Si pones lógica de fetch en `useEffect`, corre una sola vez. Si usás `useFocusEffect`, corre cada vez que vuelves a la pantalla.
- **`useEffect` con cleanup**: cuidado con setear state en callbacks de fetch después de unmount. El repo ya tuvo este bug ([commit 6fb00e6](https://github.com/Sanghel/expense-manager-native/commit/6fb00e6)) — patrón `isMounted` o `AbortController`.

```tsx
// Patrón habitual en este proyecto
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

useFocusEffect(
  useCallback(() => {
    let cancelled = false
    loadData().then((data) => { if (!cancelled) setData(data) })
    return () => { cancelled = true }
  }, [])
)
```

---

## 9. Plataforma: iOS vs Android

Casi todo es cross-platform pero hay momentos donde necesitas ramificar:

```tsx
import { Platform } from 'react-native'

if (Platform.OS === 'ios') { ... }
const padding = Platform.select({ ios: 20, android: 16 })
```

También funcionan extensiones de archivo: `Foo.ios.tsx`, `Foo.android.tsx` — el bundler elige la correcta automáticamente.

Para esta migración casi nunca necesitarás ramificar — NativeWind y los componentes core son cross-platform. Solo aparecerá en cosas como `KeyboardAvoidingView` (behavior) y permisos.

---

## 10. Networking, storage, permisos

- **`fetch`** funciona igual que web (sin CORS — los nativos no tienen CORS).
- **InsForge SDK** se importa y usa exactamente igual que en el web. La capa de actions del proyecto native ya replica el patrón ([lib/actions/transactions.actions.ts](../../lib/actions/transactions.actions.ts)).
- **`expo-secure-store`** sustituye a cookies httpOnly: guarda tokens cifrados en el keychain de iOS / EncryptedSharedPreferences de Android. Ya está usado en [context/AuthContext.tsx](../../context/AuthContext.tsx).
- **`AsyncStorage`** (no usado aún en este proyecto): equivalente a `localStorage`, sin cifrado. Para preferences no sensibles.
- **Permisos**: cualquier API que toque hardware (cámara, ubicación, notificaciones, contactos…) pide permiso al usuario. Si el usuario lo niega, la API falla. Hay que manejar el caso "denegado".

---

## 11. Cómo correr el proyecto AHORA

Requisitos:
- **iOS**: macOS + Xcode instalado (tienes mac, ✅).
- **Android**: Android Studio + un emulador configurado (opcional al principio).
- **Node 20+** y `npm`.

Pasos:

```bash
cd /Users/sanghelgonzalez/Documents/projects/expense-manager-native
npm install                # primera vez
npm start                  # arranca el Metro bundler
```

Luego en la terminal verás un menú interactivo:

- Pulsa `i` → abre simulador iOS.
- Pulsa `a` → abre emulador Android.
- Pulsa `w` → abre en web (limitado, útil para debugging puntual).
- Pulsa `r` → reload manual.
- Pulsa `j` → abre debugger.

**Hot reload** funciona out-of-the-box: cuando guardes un archivo, la app refresca conservando el estado.

> Nota: este proyecto usa algunas libs nativas (expo-secure-store, expo-auth-session) que NO funcionan en Expo Go a partir de SDK 53+. Vas a necesitar un **development build** (lo configuramos al llegar a FASE 7 si no está ya). Mientras tanto, el simulador iOS con el dev client integrado debería funcionar.

---

## 12. Debugging

- **Logs**: `console.log` aparecen en la terminal de Metro (la que abriste con `npm start`).
- **Inspector**: pulsa `j` en Metro para abrir el inspector estilo Chrome DevTools.
- **React DevTools**: `npx react-devtools` en otra terminal.
- **Errores**: aparecen en pantalla del simulador con stacktrace + botón "Reload".

---

## 13. Lo que ya tienes en el repo (lee estos archivos para orientarte)

Antes de T-1.1, dedica 15-20 min a abrir estos archivos. No tienes que entender cada línea, solo absorber el estilo del proyecto:

| Archivo | Qué aprenderás mirando |
| --- | --- |
| [app/_layout.tsx](../../app/_layout.tsx) | Layout raíz: providers, fuentes, status bar |
| [app/(dashboard)/_layout.tsx](../../app/(dashboard)/_layout.tsx) | Cómo se define una barra de tabs |
| [app/(dashboard)/transactions/index.tsx](../../app/(dashboard)/transactions/index.tsx) | FlatList, pull-to-refresh, FAB, navegación a detalle |
| [app/(dashboard)/transactions/[id].tsx](../../app/(dashboard)/transactions/[id].tsx) | Formulario con `KeyboardAvoidingView`, ScrollView, SelectModal |
| [components/ui/SelectModal.tsx](../../components/ui/SelectModal.tsx) | Modal nativo + lista filtrable — patrón base que vamos a reutilizar |
| [components/ui/FormInput.tsx](../../components/ui/FormInput.tsx) | Input con label, errores, focus state |
| [lib/actions/transactions.actions.ts](../../lib/actions/transactions.actions.ts) | Capa de acceso a datos contra InsForge — el patrón que vamos a replicar en cada fase |
| [context/AuthContext.tsx](../../context/AuthContext.tsx) | Provider de auth con expo-secure-store |
| [constants/theme.ts](../../constants/theme.ts) | Paleta de colores del proyecto |
| [tailwind.config.js](../../tailwind.config.js) | Tokens custom de NativeWind |

---

## 14. Qué NO necesitas saber todavía (lo veremos cuando aparezca)

- Reanimated y gestos (FASE 4 con charts y FASE 5 con calendario).
- `expo-notifications` y deep linking (FASE 5).
- Skia (FASE 4 con `victory-native`).
- EAS Build, code signing, app store submissions (FASE 7).
- Tests unitarios / E2E con Detox (fuera de scope inicial).
- Workflows con `react-query` / `swr` (este proyecto usa hooks custom, no necesitan lib externa).

---

## 15. Recursos recomendados (referencia rápida)

- **React Native docs** — https://reactnative.dev/docs/getting-started (la sección "The Basics" cubre lo del punto 1-7 con ejemplos interactivos)
- **Expo docs** — https://docs.expo.dev (especialmente "Guides" → "Routing", "Permissions")
- **expo-router docs** — https://docs.expo.dev/router/introduction/
- **NativeWind docs** — https://www.nativewind.dev (mira "Quirks" — utilities que se comportan distinto)
- **The React Native Cheatsheet** — https://github.com/typicode/react-native-cheatsheet (referencia tabular RN vs web)

No tienes que leer todo eso. Úsalos como referencia cuando aparezca una duda concreta.

---

## ✅ Checklist antes de arrancar T-1.1

- [ ] Leíste este doc completo (o al menos las secciones 1-7).
- [ ] Abriste y ojeaste los archivos del punto 13.
- [ ] Corriste `npm start` al menos una vez y abriste la app en simulador.
- [ ] Tienes claro: `<View>` = `<div>`, `<Text>` obligatorio, no hay HTML.
- [ ] Tienes claro: routing es por archivos, `app/(group)/` es grupo de layout sin segmento.
- [ ] Tienes claro: NativeWind ≈ Tailwind pero sin `hover:`, sin breakpoints, flexbox-only.

Cuando termines, avísame y arrancamos con **T-1.1: Portear tipos y schemas Zod**. Antes de empezar te dejaré un mini-doc `T-1.1.md` con los conceptos específicos de esa tarea (que serán mucho más cortos — solo lo nuevo respecto a este onboarding).
