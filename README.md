# Iron Cadence

A workout tracking and nutrition app built with React Native (Expo) and Node.js.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Expo 55, React Native 0.83, TypeScript, Expo Router |
| Backend | Express 5, TypeScript, Prisma 5, Zod 3 |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT (access + refresh tokens), Google OAuth |

## Project Structure

```
workout-app/
├── frontend/                 # Expo/React Native app
│   ├── app/
│   │   ├── (tabs)/           # Main tab screens (dashboard, train, nutrition, progress)
│   │   ├── auth/             # Login, register, onboarding
│   │   └── training/         # Training setup flow
│   └── src/
│       ├── components/       # Shared UI components
│       ├── constants/        # Theme, training constants
│       ├── context/          # Auth context
│       └── utils/            # API client
├── backend/
│   ├── src/
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # Business logic (workout generator, adaptive TDEE)
│   │   ├── middleware/       # Auth middleware
│   │   └── utils/            # Prisma client, JWT helpers
│   └── prisma/
│       ├── schema.prisma     # Database schema
│       └── seed.ts           # Exercise catalog + program templates
└── CLAUDE.md                 # AI development guidelines
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker
- Expo CLI (`npx expo`)

### Database Setup

```bash
# Start PostgreSQL container
docker run -d \
  --name workout-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=workout_app \
  -p 5432:5432 \
  postgres:16

# Or start existing container
docker start workout-db
```

### Backend

```bash
cd backend
npm install

# Create .env file
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/workout_app"' > .env
echo 'JWT_SECRET="your-secret-here"' >> .env
echo 'JWT_REFRESH_SECRET="your-refresh-secret-here"' >> .env

# Run migrations and seed
npm run db:migrate
npm run db:seed

# Start dev server (port 3000)
npm run dev
```

### Frontend

```bash
cd frontend
npm install

# Start Expo dev server
npm start
```

## Training System

Iron Cadence supports three training setup paths, all producing the same data model:

1. **Pick a Template** — Choose from 5 pre-built programs (PPL Hypertrophy, Upper/Lower, Full Body, etc.)
2. **Build Your Training Block** — Plan all training days upfront with custom splits
3. **Build As You Go** — Pick exercises day-by-day with volume tracking

### Periodization

- Volume progresses weekly within MEV/MRV guardrails
- RIR (Reps In Reserve) decreases across the training block
- Final week is an automatic deload (50% volume)

### Data Model

```
TrainingBlock → WorkoutSession → Exercise → ExerciseSet
```

Each training block tracks split type, volume targets per muscle group, and periodization state.

## API Overview

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/google` |
| User | `GET /user/me`, `PUT /user/me` |
| Training | Exercises CRUD, templates list/apply, training block management, session CRUD, set logging |
| Nutrition | Phase management, meal logging |
| Progress | Body weight tracking, weekly check-ins |

## Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema changes (no migration) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed exercise catalog and templates |

### Frontend

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in browser |
