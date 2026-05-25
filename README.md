# expense-manager-native

App nativa de gestión de finanzas personales (Expo SDK 54 + React Native + InsForge).

Migración 1:1 del proyecto web [expense-manager](../expense-manager) compartiendo el mismo backend InsForge.

## Stack

- **Framework:** Expo SDK 54 + expo-router 6 (file-based routing)
- **Lenguaje:** TypeScript estricto
- **Styling:** NativeWind 4 (Tailwind CSS para RN)
- **Backend:** InsForge SDK (Postgres + REST + auth con anon key + RLS)
- **Auth:** OAuth Google con `expo-auth-session` + decode local de id_token
- **Charts:** victory-native v41 + @shopify/react-native-skia v2
- **Notifications:** expo-notifications (locales)
- **Calendar:** react-native-calendars
- **Storage:** expo-secure-store (sesión)
- **Animations:** react-native-reanimated 4 + react-native-skia
- **Forms / validación:** Zod schemas

## Features (v1.0.0)

- Auth Google con whitelist
- CRUD: Transacciones, Cuentas, Categorías, Presupuestos, Metas de ahorro, Préstamos, Recordatorios
- Transacciones con auto-lock currency por cuenta + preview multi-currency + warning de cupo
- Dashboard real con summary cards + charts (balance acumulado + gastos por categoría)
- Reports con range selector (1M / 3M / 6M / 1Y) y 3 charts
- Calendario con 2 tabs (transacciones + recordatorios programados)
- Recordatorios con **push notifications locales** programadas + deep-link al tap
- Menú "+" con bottom sheet de quick actions
- Multi-currency (COP, USD, VES) con conversión via exchange_rates table
- Dark theme

## Desarrollo local

### Requisitos

- Node 20+
- pnpm 10+
- Xcode 15+ (para iOS)
- Android Studio (para Android)
- Cuenta de InsForge con el schema portado del proyecto web

### Setup

```bash
pnpm install
cp .env.example .env.local   # configurar EXPO_PUBLIC_INSFORGE_URL, EXPO_PUBLIC_INSFORGE_ANON_KEY, EXPO_PUBLIC_GOOGLE_CLIENT_ID
```

### Correr dev client

iOS:
```bash
npx expo run:ios
```

Android:
```bash
npx expo run:android
```

Después de la primera build, para development normal con Metro:
```bash
pnpm start
```

### Gotcha — pnpm 10 + Skia

Si `pod install` falla con `Skia prebuilt binaries not found`:
```bash
pnpm rebuild @shopify/react-native-skia
```

El postinstall de Skia está allowlisted en `package.json > pnpm.onlyBuiltDependencies`.

## Build con EAS

Cuando se obtengan las cuentas de developer (Apple $99/año, Google $25 one-time):

```bash
# Login (primera vez)
npx eas-cli login

# Build de development (instalable en simulator)
npx eas build --profile development --platform ios

# Build de preview (instalable con TestFlight Internal / Play Internal)
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android

# Build de production (auto-incrementa buildNumber/versionCode)
npx eas build --profile production --platform ios
npx eas build --profile production --platform android

# Submit a stores
npx eas submit --profile production --platform ios
npx eas submit --profile production --platform android
```

Profiles en [`eas.json`](./eas.json):
- `development` — con dev client, distribution internal, iOS simulator OK
- `preview` — sin dev client, distribución interna en TestFlight / Play Internal
- `production` — release con auto-incremento de build numbers

## Estructura

```
app/
├── (auth)/login.tsx              # Pantalla de login
├── (dashboard)/
│   ├── _layout.tsx               # Tab bar
│   ├── index.tsx                 # Dashboard
│   ├── transactions/             # Lista + form
│   ├── calendar/                 # 2 tabs (TX + Reminders)
│   ├── reports/                  # 3 charts con range selector
│   ├── reminders/                # CRUD + notifications
│   ├── budgets/, savings/, loans/, categories/, accounts/
│   ├── profile/                  # Settings + sign out
│   └── quick-actions.tsx         # Ruta dummy del tab "Menú"
├── _layout.tsx                   # Root + listener notif tap

components/
├── ui/                           # Primitives (BottomSheet, EmptyState, etc.)
├── charts/                       # Wrappers victory-native + Skia
├── transactions/, accounts/, budgets/, ...
└── quick-actions/QuickActionsSheet.tsx

lib/
├── actions/                      # CRUD contra InsForge (un archivo por entidad)
├── utils/                        # dashboard, reports, currency, notifications, etc.
└── validations/                  # Zod schemas

hooks/
├── useAuth, useExchangeRates, useFinancialSummary, useDebounce

context/AuthContext.tsx           # Session via SecureStore

types/database.types.ts           # Mirror del schema InsForge
```

## Workflow de desarrollo

Ver [`rules/github-flow.md`](./rules/github-flow.md). Resumen:
- `main` (producción) ← `develop` ← `feature/<n>-<slug>`
- Merge commits siempre, **NO squash**.
- Cada fase = issue de GitHub + PR `develop → main` con stop+aprobación.

## Documentación de conceptos

Notas internas del autor en Obsidian: `40 - Projects/expense-manager-native/` con bitácoras por tarea + conceptos compartidos en `10 - Concepts/`, `20 - Comparisons/`, `30 - Patterns/`.

## Licencia

Personal — no se distribuye.
