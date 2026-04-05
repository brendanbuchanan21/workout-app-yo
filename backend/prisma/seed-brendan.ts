import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

const USER_ID = '2a486c80-6000-4064-bf9b-0ba83fc983bd';

// PPL split: Push A, Pull A, Legs A, Push B, Pull B, Legs B
// We'll generate ~9 months (roughly 39 weeks) of training, 6 days/week
// with progressive overload and some variation

interface ExDef {
  name: string;
  muscle: string;
  secondary?: string;
  startWeightKg: number;
  weeklyIncKg: number;
  repLow: number;
  repHigh: number;
  sets: number;
}

const PUSH_A: ExDef[] = [
  { name: 'Barbell Bench Press', muscle: 'chest', startWeightKg: 70, weeklyIncKg: 0.5, repLow: 6, repHigh: 10, sets: 4 },
  { name: 'Incline Dumbbell Press', muscle: 'chest', startWeightKg: 25, weeklyIncKg: 0.3, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Cable Lateral Raise', muscle: 'side_delts', startWeightKg: 7, weeklyIncKg: 0.1, repLow: 12, repHigh: 15, sets: 3 },
  { name: 'Tricep Pushdown', muscle: 'triceps', startWeightKg: 25, weeklyIncKg: 0.2, repLow: 10, repHigh: 15, sets: 3 },
  { name: 'Cable Flye', muscle: 'chest', startWeightKg: 12, weeklyIncKg: 0.15, repLow: 12, repHigh: 15, sets: 3 },
];

const PULL_A: ExDef[] = [
  { name: 'Barbell Row', muscle: 'back', startWeightKg: 60, weeklyIncKg: 0.5, repLow: 6, repHigh: 10, sets: 4 },
  { name: 'Pull-Up', muscle: 'back', startWeightKg: 0, weeklyIncKg: 0, repLow: 5, repHigh: 12, sets: 3 },
  { name: 'Face Pull', muscle: 'rear_delts', startWeightKg: 15, weeklyIncKg: 0.1, repLow: 15, repHigh: 20, sets: 3 },
  { name: 'Barbell Curl', muscle: 'biceps', startWeightKg: 25, weeklyIncKg: 0.15, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Seated Cable Row', muscle: 'back', startWeightKg: 45, weeklyIncKg: 0.3, repLow: 10, repHigh: 12, sets: 3 },
];

const LEGS_A: ExDef[] = [
  { name: 'Barbell Back Squat', muscle: 'quads', startWeightKg: 80, weeklyIncKg: 0.6, repLow: 5, repHigh: 8, sets: 4 },
  { name: 'Romanian Deadlift', muscle: 'hamstrings', startWeightKg: 70, weeklyIncKg: 0.5, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Leg Extension', muscle: 'quads', startWeightKg: 40, weeklyIncKg: 0.3, repLow: 12, repHigh: 15, sets: 3 },
  { name: 'Leg Curl', muscle: 'hamstrings', startWeightKg: 30, weeklyIncKg: 0.2, repLow: 10, repHigh: 15, sets: 3 },
  { name: 'Standing Calf Raise', muscle: 'calves', startWeightKg: 60, weeklyIncKg: 0.3, repLow: 12, repHigh: 20, sets: 3 },
];

const PUSH_B: ExDef[] = [
  { name: 'Overhead Press', muscle: 'side_delts', startWeightKg: 40, weeklyIncKg: 0.3, repLow: 6, repHigh: 10, sets: 4 },
  { name: 'Dumbbell Bench Press', muscle: 'chest', startWeightKg: 28, weeklyIncKg: 0.3, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Dumbbell Lateral Raise', muscle: 'side_delts', startWeightKg: 8, weeklyIncKg: 0.1, repLow: 12, repHigh: 15, sets: 4 },
  { name: 'Overhead Tricep Extension', muscle: 'triceps', startWeightKg: 20, weeklyIncKg: 0.15, repLow: 10, repHigh: 15, sets: 3 },
  { name: 'Dips (Chest)', muscle: 'chest', startWeightKg: 0, weeklyIncKg: 0, repLow: 8, repHigh: 15, sets: 3 },
];

const PULL_B: ExDef[] = [
  { name: 'Lat Pulldown', muscle: 'back', startWeightKg: 50, weeklyIncKg: 0.4, repLow: 8, repHigh: 12, sets: 4 },
  { name: 'Chin-Up', muscle: 'back', secondary: 'biceps', startWeightKg: 0, weeklyIncKg: 0, repLow: 5, repHigh: 10, sets: 3 },
  { name: 'Reverse Flye', muscle: 'rear_delts', startWeightKg: 8, weeklyIncKg: 0.1, repLow: 12, repHigh: 15, sets: 3 },
  { name: 'Dumbbell Curl', muscle: 'biceps', startWeightKg: 12, weeklyIncKg: 0.1, repLow: 10, repHigh: 15, sets: 3 },
  { name: 'T-Bar Row', muscle: 'back', startWeightKg: 40, weeklyIncKg: 0.4, repLow: 8, repHigh: 12, sets: 3 },
];

const LEGS_B: ExDef[] = [
  { name: 'Leg Press', muscle: 'quads', startWeightKg: 140, weeklyIncKg: 1.0, repLow: 8, repHigh: 12, sets: 4 },
  { name: 'Hip Thrust', muscle: 'glutes', startWeightKg: 60, weeklyIncKg: 0.7, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Bulgarian Split Squat', muscle: 'quads', startWeightKg: 16, weeklyIncKg: 0.2, repLow: 8, repHigh: 12, sets: 3 },
  { name: 'Leg Curl', muscle: 'hamstrings', startWeightKg: 30, weeklyIncKg: 0.2, repLow: 10, repHigh: 15, sets: 3 },
  { name: 'Seated Calf Raise', muscle: 'calves', startWeightKg: 40, weeklyIncKg: 0.2, repLow: 15, repHigh: 20, sets: 3 },
];

const PPL_DAYS = [
  { label: 'Push A', exercises: PUSH_A },
  { label: 'Pull A', exercises: PULL_A },
  { label: 'Legs A', exercises: LEGS_A },
  { label: 'Push B', exercises: PUSH_B },
  { label: 'Pull B', exercises: PULL_B },
  { label: 'Legs B', exercises: LEGS_B },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(val: number, step: number): number {
  return Math.round(val / step) * step;
}

async function main() {
  // Look up catalog IDs for all exercises we reference
  const catalog = await prisma.exerciseCatalog.findMany({
    where: { isDefault: true },
    select: { id: true, name: true },
  });
  const catalogMap = new Map(catalog.map((c) => [c.name, c.id]));

  // Delete existing sessions/block for this user to start fresh
  await prisma.exerciseSet.deleteMany({
    where: { exercise: { workoutSession: { userId: USER_ID } } },
  });
  await prisma.exercise.deleteMany({
    where: { workoutSession: { userId: USER_ID } },
  });
  await prisma.workoutSession.deleteMany({ where: { userId: USER_ID } });
  await prisma.trainingBlock.deleteMany({ where: { userId: USER_ID } });

  console.log('Cleared existing workout data for Brendan');

  // Generate ~9 months of data: July 2025 through March 2026
  // That's about 39 weeks, organized into training blocks of 5 weeks each (8 blocks)
  const startDate = new Date('2025-07-07'); // A Monday
  const totalWeeks = 39;
  const weeksPerBlock = 5;
  const numBlocks = Math.ceil(totalWeeks / weeksPerBlock);

  let globalWeek = 0;

  for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
    const blockStart = new Date(startDate);
    blockStart.setDate(blockStart.getDate() + blockIdx * weeksPerBlock * 7);

    const blockWeeks = Math.min(weeksPerBlock, totalWeeks - blockIdx * weeksPerBlock);
    const isLastBlock = blockIdx === numBlocks - 1;

    const block = await prisma.trainingBlock.create({
      data: {
        id: uuid(),
        userId: USER_ID,
        status: isLastBlock ? 'active' : 'completed',
        blockNumber: blockIdx + 1,
        startDate: blockStart,
        endDate: isLastBlock ? undefined : (() => {
          const end = new Date(blockStart);
          end.setDate(end.getDate() + blockWeeks * 7 - 1);
          return end;
        })(),
        lengthWeeks: blockWeeks,
        currentWeek: isLastBlock ? blockWeeks : blockWeeks,
        splitType: 'push_pull_legs',
        daysPerWeek: 6,
        volumeTargets: {
          chest: 10, back: 10, quads: 10, hamstrings: 8,
          side_delts: 10, rear_delts: 6, biceps: 6, triceps: 6,
          glutes: 4, calves: 6, traps: 0, abs: 0,
        },
        startingRir: 3,
        rirFloor: 1,
        rirDecrementPerWeek: 0.5,
        deloadRir: 6,
      },
    });

    console.log(`Created block ${blockIdx + 1} (${block.status})`);

    for (let weekInBlock = 0; weekInBlock < blockWeeks; weekInBlock++) {
      globalWeek++;
      const isDeloadWeek = weekInBlock === blockWeeks - 1 && blockWeeks === 5;
      const weekRir = isDeloadWeek ? 6 : Math.max(1, 3 - weekInBlock * 0.5);

      // 6 training days per week (Mon-Sat, rest Sunday)
      for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
        const sessionDate = new Date(blockStart);
        sessionDate.setDate(sessionDate.getDate() + weekInBlock * 7 + dayIdx);

        // Skip some sessions randomly (~10% miss rate, more likely on day 6)
        const skipChance = dayIdx === 5 ? 0.25 : 0.08;
        if (Math.random() < skipChance) continue;

        // Don't create future sessions
        if (sessionDate > new Date()) continue;

        const dayDef = PPL_DAYS[dayIdx];
        const sessionStartHour = rand(6, 18);
        const sessionStartMin = rand(0, 59);
        const durationMin = rand(55, 85);
        const startedAt = new Date(sessionDate);
        startedAt.setHours(sessionStartHour, sessionStartMin, 0, 0);
        const completedAt = new Date(startedAt);
        completedAt.setMinutes(completedAt.getMinutes() + durationMin);

        const session = await prisma.workoutSession.create({
          data: {
            id: uuid(),
            trainingBlockId: block.id,
            userId: USER_ID,
            date: sessionDate,
            weekNumber: weekInBlock + 1,
            dayLabel: dayDef.label,
            status: 'completed',
            startedAt,
            completedAt,
          },
        });

        // Create exercises and sets
        for (let exIdx = 0; exIdx < dayDef.exercises.length; exIdx++) {
          const exDef = dayDef.exercises[exIdx];
          const catalogId = catalogMap.get(exDef.name);

          const exercise = await prisma.exercise.create({
            data: {
              id: uuid(),
              workoutSessionId: session.id,
              catalogId: catalogId || undefined,
              orderIndex: exIdx,
              exerciseName: exDef.name,
              muscleGroup: exDef.muscle,
              secondaryMuscle: exDef.secondary || undefined,
            },
          });

          // Progressive overload: weight increases over weeks
          const progressedWeight = exDef.startWeightKg + exDef.weeklyIncKg * globalWeek;
          // Add some daily variation
          const dayVariation = (Math.random() - 0.5) * 2; // +/- 1kg

          const numSets = isDeloadWeek ? Math.max(2, exDef.sets - 1) : exDef.sets;

          for (let setNum = 1; setNum <= numSets; setNum++) {
            // Later sets may have slightly lower weight/reps (fatigue)
            const fatigueDropoff = setNum > 2 ? (setNum - 2) * 0.5 : 0;
            const setWeight = exDef.startWeightKg > 0
              ? roundTo(Math.max(5, progressedWeight + dayVariation - fatigueDropoff), 2.5)
              : 0;

            const targetReps = rand(exDef.repLow, exDef.repHigh);
            // Actual reps: sometimes hit target, sometimes +/- 1-2
            const repVariation = rand(-2, 1);
            const actualReps = Math.max(exDef.repLow - 1, targetReps + repVariation);
            const targetRir = Math.round(weekRir);
            const actualRir = Math.max(0, targetRir + rand(-1, 1));

            // ~95% completion rate
            const completed = Math.random() < 0.95;

            await prisma.exerciseSet.create({
              data: {
                id: uuid(),
                exerciseId: exercise.id,
                setNumber: setNum,
                setType: 'working',
                targetReps,
                targetRir,
                targetWeightKg: setWeight,
                actualReps: completed ? actualReps : undefined,
                actualRir: completed ? actualRir : undefined,
                actualWeightKg: completed ? setWeight : undefined,
                completed,
              },
            });
          }
        }
      }
    }
  }

  // Count what we created
  const sessionCount = await prisma.workoutSession.count({ where: { userId: USER_ID } });
  const exerciseCount = await prisma.exercise.count({ where: { workoutSession: { userId: USER_ID } } });
  const setCount = await prisma.exerciseSet.count({ where: { exercise: { workoutSession: { userId: USER_ID } } } });

  console.log(`\nDone! Created:`);
  console.log(`  ${numBlocks} training blocks`);
  console.log(`  ${sessionCount} workout sessions`);
  console.log(`  ${exerciseCount} exercises`);
  console.log(`  ${setCount} sets`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
