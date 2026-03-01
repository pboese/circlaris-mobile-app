# CLAUDE.md — Circlaris Mobile App

## Project Overview

`circlaris-mobile` is a React Native / Expo mobile application for the Circlaris platform. It provides authenticated access to business KPI dashboards (figures) for customers. The app is built with the **Managed Expo workflow** using **expo-router** for file-based navigation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9 (strict mode) |
| Framework | React Native 0.83.2 + React 19.2.0 |
| Expo SDK | ~55.0.0 |
| Routing | expo-router ~55.0.3 (file-based) |
| Auth persistence | expo-secure-store |
| Calendar/date picker | react-native-calendars |
| SVG support | react-native-svg + react-native-svg-transformer |
| Bundler | Metro (via Expo) |
| Build | Managed Expo workflow (no committed ios/ or android/) |

---

## Project Structure

```
circlaris-mobile-app/
├── app/                        # Expo Router pages — each file is a route
│   ├── _layout.tsx             # Root layout: AuthProvider + NavigationGuard + Stack
│   ├── index.tsx               # Route "/" — Login screen
│   └── dashboard.tsx           # Route "/dashboard" — KPI Dashboard screen
├── context/
│   └── auth.tsx                # AuthProvider, useAuth hook, Customer & AuthContextType interfaces
├── assets/
│   ├── circlaris_logo_1F4143.svg  # Brand logo (used on login screen)
│   ├── circlaris_icon_1F4143.svg  # Brand icon
│   ├── icon.png                   # App icon (iOS/web)
│   ├── splash-icon.png            # Splash screen
│   ├── favicon.png                # Web favicon
│   ├── android-icon-foreground.png
│   ├── android-icon-background.png
│   └── android-icon-monochrome.png
├── __tests__/                  # Jest test files (mirrors source structure)
│   ├── context/auth.test.tsx
│   └── app/
│       ├── index.test.tsx
│       └── dashboard.test.tsx
├── __mocks__/
│   └── svgMock.tsx             # SVG mock for Jest (returns a plain <View>)
├── app.json                    # Expo app configuration (name, slug, icons, scheme)
├── eas.json                    # EAS Build profiles (development / preview / production)
├── package.json                # Dependencies, npm scripts, Jest config
├── tsconfig.json               # TypeScript config (strict, @/* path alias)
├── metro.config.js             # Metro bundler — SVG transformer configured here
├── declarations.d.ts           # Module declaration for *.svg and ProcessEnv types
├── .env                        # Local env vars (gitignored)
├── .env.example                # Env var template (committed)
├── .eslintrc.js                # ESLint config (expo + prettier)
├── .prettierrc                 # Prettier config
├── .prettierignore             # Prettier ignore rules
└── .gitignore
```

---

## Development Commands

```bash
# Start the Expo dev server (choose platform in terminal/browser)
npm start

# Open directly on a platform
npm run android       # Android emulator or connected device
npm run ios           # iOS simulator (macOS only)
npm run web           # Browser (Metro web bundler)

# Testing
npm test              # Run all tests once (CI mode)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Linting & formatting
npm run lint          # Check for ESLint errors
npm run lint:fix      # Auto-fix ESLint errors
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without writing
```

---

## Routing & Navigation

Routing uses **expo-router** with a file-system convention under `app/`:

| File | Route | Screen |
|---|---|---|
| `app/index.tsx` | `/` | Login |
| `app/dashboard.tsx` | `/dashboard` | KPI Dashboard |

### Navigation Guard (`app/_layout.tsx`)

The `NavigationGuard` component inside `RootLayout` enforces auth-based redirects:
- If the user **has a token** and is not on `/dashboard` → redirect to `/dashboard`
- If the user **has no token** and is on `/dashboard` → redirect to `/`

The guard waits for `isLoading` to be `false` before acting. Do not add redirects elsewhere — all route protection lives here.

---

## Authentication

### Context: `context/auth.tsx`

`AuthProvider` wraps the entire app (via `_layout.tsx`). Access auth state anywhere with:

```ts
const { token, customer, isLoading, signIn, signOut } = useAuth();
```

#### Interfaces

```ts
export interface Customer {
  name: string;    // Company/customer name
  user: string;    // Logged-in user's display name
  logo: string;    // URL to customer logo image
  favicon: string; // URL to customer favicon
}
```

#### Persistence

Auth data is persisted via `expo-secure-store` using two keys:
- `auth_token` — the Bearer token string
- `auth_customer` — JSON-serialized `Customer` object

#### Flow

1. On app start, `AuthProvider` reads both keys from SecureStore and sets state.
2. `signIn(token, customer)` writes both to SecureStore and updates state.
3. `signOut()` deletes both from SecureStore and clears state.
4. `NavigationGuard` reacts to state changes and redirects accordingly.

---

## Environment Variables

Variables are defined in `.env` (local, gitignored) and must be prefixed with `EXPO_PUBLIC_` to be inlined at build time. See `.env.example` for the full list.

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for all API calls (no trailing slash) |

**In code:** access via `process.env.EXPO_PUBLIC_API_BASE_URL` — no import needed.

**In tests:** module-level constants that read `process.env` are evaluated at import time, so setting `process.env.EXPO_PUBLIC_*` in `beforeEach` won't affect already-imported constants. Use path-pattern assertions (`.toMatch(/\/login$/)`) instead of asserting the full URL.

**For EAS Build:** env vars are declared per-profile in `eas.json`. For sensitive values use `eas secret:create` instead of committing them to `eas.json`.

---

## API

**Base URL:** configured via `EXPO_PUBLIC_API_BASE_URL` (see `.env.example`)

### POST `/mobile-api/login`

**Body:** `{ email: string, password: string }`

**Response fields checked (in order):**
- `data.token` → `data?.token ?? data?.access_token ?? data?.data?.token`
- `data.customer` → passed directly to `signIn()`

**Error messages:** read from `data.message` or `data.error`.

### GET `/mobile-api/figures?start=YYYY-MM-DD&end=YYYY-MM-DD`

**Headers:** `Authorization: Bearer <token>`

**Response shape (`Figures` interface):**
```ts
interface Figures {
  netSales: number;
  profit: number;
  profitMargin: number;
  purchaseTotalArticles: number;
  averageSellingPriceArticles: number;
  serviceCost: number;
  purchases: number;
  sales: number;
  live: number;
  reserved: number;
}
```

Dates must be in `YYYY-MM-DD` format (produced by `toApiDate()` in `dashboard.tsx`).

---

## UI & Styling Conventions

### Styling approach

All styles use `StyleSheet.create()` — no CSS, no Tailwind, no styled-components.

### Brand palette

| Token | Hex | Usage |
|---|---|---|
| Brand teal | `#1F4143` | Buttons, active states, links, calendar highlight |
| Brand teal light | `#E8EEEE` | Logout button background |
| Background | `#F3F4F8` | Screen background |
| Surface | `#ffffff` | Cards, inputs, headers |
| Input bg | `#F9FAFB` | TextInput background |
| Border | `#E5E7EB` | Input borders, dividers |
| Text primary | `#111827` | Headings, values |
| Text secondary | `#6B7280` | Labels, subtitles, hints |
| Text disabled | `#D1D5DB` | Disabled states |
| Error bg | `#FEF2F2` | Error box background |
| Error border | `#FECACA` | Error box border |
| Error text | `#DC2626` | Error messages |

### Layout conventions

- Screen root: `<SafeAreaView>` from `react-native-safe-area-context`
- Headers with `headerShown: false` (Stack navigator configured in `_layout.tsx`)
- Use `<Pressable>` (not `<TouchableOpacity>`) for tappable elements; apply opacity on press via `({ pressed }) => [...]` style pattern
- `KeyboardAvoidingView` on forms: `behavior="padding"` on iOS, `behavior="height"` on Android

### Border radii used

- `8` — small buttons (logout)
- `10` — error box
- `12` — inputs, primary button, range bar
- `16` — figure cards
- `20` — login card, modal sheet

### Number formatting

All numbers are formatted for the **German locale** (`de-DE`):
- Currency: `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })` → `€ 1.234,56`
- Percent: 1 decimal place + ` %` suffix → `12,3 %`
- Count: plain integer with `.` thousands separator

---

## SVG Usage

SVG files are imported as React components thanks to `react-native-svg-transformer` configured in `metro.config.js` and typed in `declarations.d.ts`:

```ts
import Logo from '../assets/circlaris_logo_1F4143.svg';

// Usage with explicit size:
<Logo width={180} height={72} />
```

Do not import SVGs via `Image` — use them as JSX components.

---

## TypeScript Conventions

- `strict: true` — no implicit `any`, no optional chaining shortcuts that hide null
- Path alias `@/*` resolves to the project root (`./`)
  - Example: `import { useAuth } from '@/context/auth'`
  - Note: current files use relative imports (`../context/auth`); either style is valid
- Type all component props explicitly
- Prefer `interface` for object shapes, `type` for unions/aliases

---

## Expo Configuration (`app.json`)

- **App scheme:** `circlaris` (for deep linking)
- **Orientation:** portrait only
- **UI style:** light
- **Android predictive back:** disabled (`predictiveBackGestureEnabled: false`)
- **Plugins registered:** `expo-router`, `@react-native-community/datetimepicker`
- **Web bundler:** metro

---

## Key Patterns to Follow

1. **Auth is always accessed via `useAuth()`** — never read SecureStore directly from screens.
2. **Navigation is managed exclusively by `NavigationGuard`** — screens do not call `router.replace` or `router.push` for auth redirects.
3. **Date ranges default to** first-of-current-month → today. When applying a new range, both `start` and `end` must be selected before `applyRange()` enables.
4. **API calls use `fetch` directly** — no axios or custom HTTP client.
5. **Figures are re-fetched on every date-range change** via a `useEffect` that depends on `[startDate, endDate]`.
6. **Modal date picker uses a two-tap UX:** first tap sets start, second tap (same day or later) sets end; if second tap is before start, it resets to new start.
7. **German UI strings** are used in the date-picker modal (`Abbrechen`, `Anwenden`, `Zeitraum wählen`, `Startdatum auswählen`, `Enddatum auswählen`). Keep these in German.

---

## Git Workflow

- **Main branch:** `master` / `main`
- **Feature branches:** use descriptive names, e.g. `claude/add-claude-documentation-XA3D3`
- The `ios/` and `android/` directories are **gitignored** — this is a Managed Expo project; native code is generated by EAS Build or `expo prebuild` and should not be committed.
- No CI/CD pipeline is configured in the repo.

---

## Testing

Tests use **Jest 29** + **jest-expo** + **@testing-library/react-native**.

### Structure

```
__tests__/
  context/
    auth.test.tsx      # AuthProvider + useAuth unit tests
  app/
    index.test.tsx     # Login screen interaction tests
    dashboard.test.tsx # Dashboard screen rendering + fetch tests
__mocks__/
  svgMock.tsx          # Renders SVG imports as a plain <View> in tests
```

### Running tests

```bash
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Jest config (in `package.json`)

- **Preset:** `jest-expo` (must match the installed Expo SDK major version — currently SDK 55 / `jest-expo@55`)
- **SVG mock:** `moduleNameMapper` maps `*.svg` → `__mocks__/svgMock.tsx`
- **transformIgnorePatterns:** extended to include `react-native-calendars` and `react-native-svg`
- **Coverage sources:** `app/**` and `context/**`

### Mocking conventions

| What | How |
|---|---|
| `expo-secure-store` | `jest.mock('expo-secure-store')` — auto-mocked |
| `expo-router` | `jest.mock('expo-router', () => ({ useRouter: ..., useSegments: ... }))` |
| `context/auth` | `jest.mock('../../context/auth', () => ({ useAuth: () => mockValue }))` |
| `react-native-calendars` | `jest.mock('react-native-calendars', () => ({ Calendar: () => null }))` |
| SVG assets | Handled globally via `moduleNameMapper` in jest config |
| `fetch` | `global.fetch = jest.fn()` in `beforeEach` |

### Known test behaviour

- `console.error` warnings about `act()` appear for async state updates (Promises in `useEffect`). These are warnings only — they do not fail tests. `waitFor` from `@testing-library/react-native` handles the assertions correctly.
- `EXPO_PUBLIC_*` env vars are evaluated at module import time, not in `beforeEach`. Assert URL paths with regex (`.toMatch(/\/login$/)`) rather than the full constructed URL.

---

## Linting & Formatting

| Tool | Config file | Command |
|---|---|---|
| ESLint | `.eslintrc.js` | `npm run lint` / `npm run lint:fix` |
| Prettier | `.prettierrc` | `npm run format` / `npm run format:check` |

**ESLint extends:** `expo` (TypeScript + React + React Native + Hooks rules) + `prettier` (disables conflicting rules).

**Prettier settings:** single quotes, 2-space indent, 100-char print width, trailing commas, semicolons.

---

## EAS Build

`eas.json` defines three build profiles:

| Profile | Distribution | Use case |
|---|---|---|
| `development` | Internal (ad-hoc) | Local testing with Expo Dev Client |
| `preview` | Internal (ad-hoc) | Staging / QA builds |
| `production` | Store | App Store / Play Store submission |

### First-time EAS setup

```bash
npm install -g eas-cli
eas login
eas build:configure   # Links to your EAS project, writes projectId to app.json
```

### Triggering builds

```bash
eas build --platform ios --profile preview
eas build --platform android --profile production
eas build --platform all --profile development
```

### Environment variables in EAS

Non-sensitive values are set per-profile in `eas.json`. For secrets:

```bash
eas secret:create --scope project --name MY_SECRET --value "..."
```

---

## What Still Needs Work

- **Multiple screens / tabs** — app currently has exactly two screens
- **EAS project linking** — run `eas build:configure` to write `projectId` into `app.json` (requires an Expo account)
- **CI/CD** — no GitHub Actions or other pipeline configured yet
