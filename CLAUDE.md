# Iron Cadence - Development Guidelines

## Project Overview

Workout tracking + nutrition app. Monorepo with `/frontend` (Expo/React Native) and `/backend` (Node/Express/Prisma).

## Version Constraints (DO NOT UPGRADE)

- **Prisma 5** — v7 breaks datasource url config
- **Zod 3** — v4 changed `.errors` to `.issues`
- **Express 5** — `req.params` values are `string | string[]`, always use `String()` to cast

## Running the App

```bash
# Backend
cd backend && npm run dev          # Express on :3000
npm run db:migrate                 # Prisma migrations
npm run db:seed                    # Seed 90 exercises + 5 templates

# Frontend (iOS Simulator)
cd frontend && npx expo run:ios    # Compiles native shell, boots simulator, starts Metro

# Database (OrbStack — primary)
docker start workout-db            # Start existing container
docker ps                          # Verify it's running
docker logs workout-db             # Check logs if issues

# Database (Docker Desktop — fallback)
# 1. Quit OrbStack:  osascript -e 'quit app "OrbStack"'
# 2. Open Docker Desktop:  open -a "Docker Desktop"
# 3. Wait for it to fully start, then:
docker start workout-db            # Same command, different runtime

# Switching back to OrbStack:
# 1. Quit Docker Desktop:  osascript -e 'quit app "Docker Desktop"'
# 2. Open OrbStack:  open -a "OrbStack"
# 3. docker start workout-db

# Create container from scratch (if needed):
# docker run -d --name workout-db -p 5432:5432 \
#   -e POSTGRES_USER=workout -e POSTGRES_PASSWORD=workout \
#   -e POSTGRES_DB=workout postgres:16
```

## Backend Conventions

### Route Structure

- One `Router()` per domain file in `backend/src/routes/`
- Mount at `/api/<domain>` in `index.ts`
- Every protected route uses `requireAuth` middleware
- Type request as `AuthRequest` for `req.userId`

### Zod Validation

- Define schemas as **module-level constants** (not inline in handlers)
- Name them `<action><Entity>Schema` (e.g., `createBlockSchema`, `logSetSchema`)
- Validate with `schema.parse(req.body)` at the top of the handler

### Error Handling

Every route handler follows this pattern:

```typescript
try {
  const data = someSchema.parse(req.body);
  // ... logic
  res.json({ entity });
} catch (error) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid input', details: error.errors });
    return;
  }
  console.error('Descriptive error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### Response Shape

- **Success (single):** `{ entity: data }` — e.g., `{ exercise }`, `{ trainingBlock }`
- **Success (list):** `{ entities: [] }` — e.g., `{ exercises }`, `{ templates }`
- **Create:** status `201`
- **Error:** `{ error: string, details?: any }`
- **Not found:** status `404` with `{ error: 'X not found' }`

### Prisma

- Import client from `utils/prisma` (singleton)
- JSON fields (`volumeTargets`, `customDays`, etc.) are typed with `as` casts — this is acceptable
- Always include `orderBy` on list queries for deterministic results

## File Size & Component Extraction

- **Max 300 LOC per file** — if a file exceeds this, break it up
- **Screen files** (`app/`) should be thin orchestrators — state, data fetching, and layout only
- **Extract components** into `src/components/<Domain>/` (e.g., `src/components/Training/SetRow.tsx`)
- **Extract hooks** into `src/hooks/` when logic is reused or a screen's hook section exceeds ~30 lines (e.g., `useTrainingSession.ts`)
- **Extract helpers** into `src/utils/` for pure functions that don't depend on React
- **Backend routes** that grow large should move business logic into `src/services/`

## Frontend Conventions

### Screen Structure

Every screen follows this layout:

```tsx
export default function ScreenName() {
  // hooks
  // state
  // data fetching with useFocusEffect
  // handlers
  // loading state → centered ActivityIndicator
  // empty state → centered message
  // main render

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* content */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ ... });
```

### Styling

- Use `StyleSheet.create()` at the bottom of every file
- All colors from `COLORS`, spacing from `SPACING`, radii from `RADIUS` (imported from `constants/theme`)
- Small one-off styles like `{ flex: 1 }` are acceptable inline — anything reusable goes in the StyleSheet
- Never hardcode color values. Always use theme constants

### Data Fetching

- Use `apiGet`, `apiPost`, `apiPut` from `utils/api.ts`
- Reload data on tab focus with `useFocusEffect` + `useCallback`
- Check `res.ok` before calling `res.json()`
- Handle errors with try/catch, log with `console.error`

### TypeScript

- Define interfaces at the top of each screen file for data shapes used only in that screen
- Shared types used across multiple screens go in `src/types/`
- Prefer `interface` over `type` for object shapes

### Import Order

1. React (`react`, `react-native`)
2. Third-party (`expo-*`, `react-native-*`, `@react-navigation/*`)
3. Local (`../../src/context/*`, `../../src/utils/*`, `../../src/constants/*`)

Separate each group with a blank line.

### File Naming

- Screens: lowercase (`train.tsx`, `nutrition.tsx`) — Expo Router convention
- Components: PascalCase (`MacroRing.tsx`, `SetRow.tsx`)
- Utils/constants: camelCase (`api.ts`, `theme.ts`)

## UI/UX Rules

- **No em dashes** in UI text — use commas instead. Em dashes feel AI-generated.
- **Dark theme only** — bg_primary (#0C0C0E) with amber accent (#E8912D)
- Brand name is **Iron Cadence**
- Use `text_primary` for headings, `text_secondary` for body, `text_tertiary` for labels/meta
- Cards use `bg_elevated` or `bg_secondary` with `border_subtle`

## Git

- Commit messages: imperative mood, concise (e.g., "Add session completion endpoint")
- No generated files in commits (node_modules, dist, .expo)
