import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExerciseSeed {
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  movementType: string;
  repRangeLow: number;
  repRangeHigh: number;
}

const exercises: ExerciseSeed[] = [
  // ===== CHEST =====
  { name: 'Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'barbell', movementType: 'compound', repRangeLow: 5, repRangeHigh: 10 },
  { name: 'Incline Barbell Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Dumbbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Incline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Dumbbell Flye', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Cable Flye', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Machine Chest Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Pec Deck', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Dips (Chest)', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'bodyweight', movementType: 'compound', repRangeLow: 6, repRangeHigh: 12 },
  { name: 'Low Cable Flye', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },

  // ===== BACK =====
  { name: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Pull-Up', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'bodyweight', movementType: 'compound', repRangeLow: 5, repRangeHigh: 12 },
  { name: 'Lat Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'cable', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Seated Cable Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'cable', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Dumbbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'T-Bar Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Chest-Supported Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Straight-Arm Pulldown', primaryMuscle: 'back', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Machine Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Chin-Up', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'bodyweight', movementType: 'compound', repRangeLow: 5, repRangeHigh: 12 },

  // ===== QUADS =====
  { name: 'Barbell Back Squat', primaryMuscle: 'quads', secondaryMuscles: ['hamstrings', 'glutes'], equipment: 'barbell', movementType: 'compound', repRangeLow: 5, repRangeHigh: 10 },
  { name: 'Front Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'barbell', movementType: 'compound', repRangeLow: 5, repRangeHigh: 8 },
  { name: 'Leg Press', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Hack Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Leg Extension', primaryMuscle: 'quads', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Bulgarian Split Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Goblet Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 15 },
  { name: 'Walking Lunge', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Sissy Squat', primaryMuscle: 'quads', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Pendulum Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'machine', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },

  // ===== HAMSTRINGS =====
  { name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Dumbbell Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Good Morning', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Nordic Hamstring Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 5, repRangeHigh: 10 },
  { name: 'Stiff-Leg Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Single-Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },

  // ===== SIDE DELTS =====
  { name: 'Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Dumbbell Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Cable Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Upright Row', primaryMuscle: 'side_delts', secondaryMuscles: ['traps'], equipment: 'barbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Cable Upright Row', primaryMuscle: 'side_delts', secondaryMuscles: ['traps'], equipment: 'cable', movementType: 'compound', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Dumbbell Y-Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Lu Raise', primaryMuscle: 'side_delts', secondaryMuscles: ['front_delts'], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Overhead Press', primaryMuscle: 'side_delts', secondaryMuscles: ['triceps', 'front_delts'], equipment: 'barbell', movementType: 'compound', repRangeLow: 5, repRangeHigh: 10 },

  // ===== REAR DELTS =====
  { name: 'Face Pull', primaryMuscle: 'rear_delts', secondaryMuscles: ['traps'], equipment: 'cable', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Reverse Flye', primaryMuscle: 'rear_delts', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Reverse Pec Deck', primaryMuscle: 'rear_delts', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Dumbbell Reverse Flye', primaryMuscle: 'rear_delts', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Cable Reverse Flye', primaryMuscle: 'rear_delts', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Rear Delt Row', primaryMuscle: 'rear_delts', secondaryMuscles: ['back'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Band Pull-Apart', primaryMuscle: 'rear_delts', secondaryMuscles: ['traps'], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 15, repRangeHigh: 25 },

  // ===== BICEPS =====
  { name: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Incline Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Hammer Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Cable Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Preacher Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Machine Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Spider Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'EZ Bar Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Concentration Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },

  // ===== TRICEPS =====
  { name: 'Tricep Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Overhead Tricep Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Skull Crusher', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Close-Grip Bench Press', primaryMuscle: 'triceps', secondaryMuscles: ['chest'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 10 },
  { name: 'Dips (Triceps)', primaryMuscle: 'triceps', secondaryMuscles: ['chest'], equipment: 'bodyweight', movementType: 'compound', repRangeLow: 6, repRangeHigh: 12 },
  { name: 'Dumbbell Kickback', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Overhead Dumbbell Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Machine Tricep Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },

  // ===== CALVES =====
  { name: 'Standing Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Seated Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Leg Press Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Smith Machine Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Single-Leg Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },

  // ===== ABS =====
  { name: 'Cable Crunch', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Hanging Leg Raise', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 15 },
  { name: 'Ab Rollout', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Decline Crunch', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'bodyweight', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 20 },
  { name: 'Machine Crunch', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'machine', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Pallof Press', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },

  // ===== GLUTES (bonus — many users want direct glute work) =====
  { name: 'Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'barbell', movementType: 'compound', repRangeLow: 6, repRangeHigh: 12 },
  { name: 'Cable Pull-Through', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'cable', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Glute Bridge', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'barbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Step-Up', primaryMuscle: 'glutes', secondaryMuscles: ['quads'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 8, repRangeHigh: 12 },
  { name: 'Kickback (Cable)', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: 'cable', movementType: 'isolation', repRangeLow: 12, repRangeHigh: 15 },

  // ===== TRAPS =====
  { name: 'Barbell Shrug', primaryMuscle: 'traps', secondaryMuscles: [], equipment: 'barbell', movementType: 'isolation', repRangeLow: 8, repRangeHigh: 15 },
  { name: 'Dumbbell Shrug', primaryMuscle: 'traps', secondaryMuscles: [], equipment: 'dumbbell', movementType: 'isolation', repRangeLow: 10, repRangeHigh: 15 },
  { name: 'Rack Pull', primaryMuscle: 'traps', secondaryMuscles: ['back'], equipment: 'barbell', movementType: 'compound', repRangeLow: 5, repRangeHigh: 8 },
  { name: 'Farmers Walk', primaryMuscle: 'traps', secondaryMuscles: ['forearms'], equipment: 'dumbbell', movementType: 'compound', repRangeLow: 1, repRangeHigh: 1 },
];

const programTemplates = [
  {
    name: 'PPL Hypertrophy',
    description: 'Classic Push/Pull/Legs split optimized for muscle growth. High volume with progressive overload across the training block.',
    splitType: 'push_pull_legs',
    daysPerWeek: 6,
    lengthWeeks: 5,
    difficulty: 'intermediate',
    days: [
      {
        dayLabel: 'Push A',
        muscleGroups: ['chest', 'side_delts', 'triceps'],
        exercises: [
          { exerciseName: 'Barbell Bench Press', muscleGroup: 'chest', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Cable Flye', muscleGroup: 'chest', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Overhead Press', muscleGroup: 'side_delts', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Lateral Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Pull A',
        muscleGroups: ['back', 'rear_delts', 'biceps'],
        exercises: [
          { exerciseName: 'Barbell Row', muscleGroup: 'back', sets: 4, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Face Pull', muscleGroup: 'rear_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Barbell Curl', muscleGroup: 'biceps', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Hammer Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
        ],
      },
      {
        dayLabel: 'Legs A',
        muscleGroups: ['quads', 'hamstrings', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Barbell Back Squat', muscleGroup: 'quads', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Leg Press', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Leg Extension', muscleGroup: 'quads', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Lying Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Standing Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Hanging Leg Raise', muscleGroup: 'abs', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Push B',
        muscleGroups: ['chest', 'side_delts', 'triceps'],
        exercises: [
          { exerciseName: 'Dumbbell Bench Press', muscleGroup: 'chest', sets: 4, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Incline Barbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Pec Deck', muscleGroup: 'chest', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Dumbbell Y-Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Cable Lateral Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Overhead Tricep Extension', muscleGroup: 'triceps', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Pull B',
        muscleGroups: ['back', 'rear_delts', 'biceps'],
        exercises: [
          { exerciseName: 'Pull-Up', muscleGroup: 'back', sets: 4, repRangeLow: 5, repRangeHigh: 10 },
          { exerciseName: 'Chest-Supported Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Straight-Arm Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Reverse Pec Deck', muscleGroup: 'rear_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Incline Dumbbell Curl', muscleGroup: 'biceps', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Cable Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Legs B',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Hack Squat', muscleGroup: 'quads', sets: 4, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Seated Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Hip Thrust', muscleGroup: 'glutes', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Seated Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Cable Crunch', muscleGroup: 'abs', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
    ],
  },
  {
    name: 'Upper/Lower Strength-Hypertrophy',
    description: 'Balanced 4-day split with strength focus on Day 1/3 and hypertrophy focus on Day 2/4. Great for intermediates.',
    splitType: 'upper_lower',
    daysPerWeek: 4,
    lengthWeeks: 5,
    difficulty: 'intermediate',
    days: [
      {
        dayLabel: 'Upper A (Strength)',
        muscleGroups: ['chest', 'back', 'side_delts', 'biceps', 'triceps'],
        exercises: [
          { exerciseName: 'Barbell Bench Press', muscleGroup: 'chest', sets: 4, repRangeLow: 4, repRangeHigh: 6 },
          { exerciseName: 'Barbell Row', muscleGroup: 'back', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Overhead Press', muscleGroup: 'side_delts', sets: 3, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Barbell Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Skull Crusher', muscleGroup: 'triceps', sets: 2, repRangeLow: 8, repRangeHigh: 10 },
        ],
      },
      {
        dayLabel: 'Lower A (Strength)',
        muscleGroups: ['quads', 'hamstrings', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Barbell Back Squat', muscleGroup: 'quads', sets: 4, repRangeLow: 4, repRangeHigh: 6 },
          { exerciseName: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 4, repRangeLow: 6, repRangeHigh: 8 },
          { exerciseName: 'Leg Press', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Lying Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Standing Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Hanging Leg Raise', muscleGroup: 'abs', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Upper B (Hypertrophy)',
        muscleGroups: ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps'],
        exercises: [
          { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Cable Flye', muscleGroup: 'chest', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Straight-Arm Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Lateral Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Face Pull', muscleGroup: 'rear_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Incline Dumbbell Curl', muscleGroup: 'biceps', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Lower B (Hypertrophy)',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Hack Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Leg Extension', muscleGroup: 'quads', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Seated Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Hip Thrust', muscleGroup: 'glutes', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Seated Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Cable Crunch', muscleGroup: 'abs', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
    ],
  },
  {
    name: 'Full Body 3x',
    description: 'Hit every muscle group 3 times per week. Efficient for busy schedules with high frequency for maximum growth stimulus.',
    splitType: 'full_body',
    daysPerWeek: 3,
    lengthWeeks: 5,
    difficulty: 'beginner',
    days: [
      {
        dayLabel: 'Full Body A',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'side_delts', 'biceps', 'triceps'],
        exercises: [
          { exerciseName: 'Barbell Bench Press', muscleGroup: 'chest', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Barbell Row', muscleGroup: 'back', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Barbell Back Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 2, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Lateral Raise', muscleGroup: 'side_delts', sets: 2, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Barbell Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Full Body B',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'side_delts', 'rear_delts', 'abs'],
        exercises: [
          { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Leg Press', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Lying Leg Curl', muscleGroup: 'hamstrings', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Overhead Press', muscleGroup: 'side_delts', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Face Pull', muscleGroup: 'rear_delts', sets: 2, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Cable Crunch', muscleGroup: 'abs', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Full Body C',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'biceps', 'triceps', 'calves'],
        exercises: [
          { exerciseName: 'Machine Chest Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Dumbbell Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Hack Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Dumbbell Romanian Deadlift', muscleGroup: 'hamstrings', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Hammer Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Overhead Tricep Extension', muscleGroup: 'triceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Standing Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
    ],
  },
  {
    name: 'PPL Power-Building',
    description: 'Push/Pull/Legs with heavy compound work followed by hypertrophy accessories. Best of both worlds for strength and size.',
    splitType: 'push_pull_legs',
    daysPerWeek: 6,
    lengthWeeks: 5,
    difficulty: 'advanced',
    days: [
      {
        dayLabel: 'Push A (Heavy)',
        muscleGroups: ['chest', 'side_delts', 'triceps'],
        exercises: [
          { exerciseName: 'Barbell Bench Press', muscleGroup: 'chest', sets: 5, repRangeLow: 3, repRangeHigh: 6 },
          { exerciseName: 'Overhead Press', muscleGroup: 'side_delts', sets: 4, repRangeLow: 4, repRangeHigh: 6 },
          { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Lateral Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 15 },
          { exerciseName: 'Close-Grip Bench Press', muscleGroup: 'triceps', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
        ],
      },
      {
        dayLabel: 'Pull A (Heavy)',
        muscleGroups: ['back', 'rear_delts', 'biceps'],
        exercises: [
          { exerciseName: 'Barbell Row', muscleGroup: 'back', sets: 5, repRangeLow: 4, repRangeHigh: 6 },
          { exerciseName: 'Pull-Up', muscleGroup: 'back', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Face Pull', muscleGroup: 'rear_delts', sets: 3, repRangeLow: 12, repRangeHigh: 15 },
          { exerciseName: 'EZ Bar Curl', muscleGroup: 'biceps', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
        ],
      },
      {
        dayLabel: 'Legs A (Heavy)',
        muscleGroups: ['quads', 'hamstrings', 'calves'],
        exercises: [
          { exerciseName: 'Barbell Back Squat', muscleGroup: 'quads', sets: 5, repRangeLow: 3, repRangeHigh: 6 },
          { exerciseName: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Leg Press', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Lying Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Standing Calf Raise', muscleGroup: 'calves', sets: 4, repRangeLow: 8, repRangeHigh: 12 },
        ],
      },
      {
        dayLabel: 'Push B (Volume)',
        muscleGroups: ['chest', 'side_delts', 'triceps'],
        exercises: [
          { exerciseName: 'Dumbbell Bench Press', muscleGroup: 'chest', sets: 4, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Cable Flye', muscleGroup: 'chest', sets: 3, repRangeLow: 12, repRangeHigh: 15 },
          { exerciseName: 'Machine Lateral Raise', muscleGroup: 'side_delts', sets: 4, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Pec Deck', muscleGroup: 'chest', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Overhead Tricep Extension', muscleGroup: 'triceps', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Dumbbell Kickback', muscleGroup: 'triceps', sets: 2, repRangeLow: 12, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Pull B (Volume)',
        muscleGroups: ['back', 'rear_delts', 'biceps'],
        exercises: [
          { exerciseName: 'Chin-Up', muscleGroup: 'back', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Chest-Supported Row', muscleGroup: 'back', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Straight-Arm Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Dumbbell Reverse Flye', muscleGroup: 'rear_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Incline Dumbbell Curl', muscleGroup: 'biceps', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Concentration Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Legs B (Volume)',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Hack Squat', muscleGroup: 'quads', sets: 4, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'quads', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Seated Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 10, repRangeHigh: 12 },
          { exerciseName: 'Hip Thrust', muscleGroup: 'glutes', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Leg Extension', muscleGroup: 'quads', sets: 3, repRangeLow: 12, repRangeHigh: 15 },
          { exerciseName: 'Seated Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Ab Rollout', muscleGroup: 'abs', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
        ],
      },
    ],
  },
  {
    name: 'Upper/Lower 3-Day',
    description: 'Alternating Upper/Lower on 3 days per week. Simple, effective, and recovery-friendly for beginners or those with limited time.',
    splitType: 'upper_lower',
    daysPerWeek: 3,
    lengthWeeks: 5,
    difficulty: 'beginner',
    days: [
      {
        dayLabel: 'Upper A',
        muscleGroups: ['chest', 'back', 'side_delts', 'biceps', 'triceps'],
        exercises: [
          { exerciseName: 'Barbell Bench Press', muscleGroup: 'chest', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Barbell Row', muscleGroup: 'back', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Overhead Press', muscleGroup: 'side_delts', sets: 3, repRangeLow: 6, repRangeHigh: 10 },
          { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Dumbbell Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Lower',
        muscleGroups: ['quads', 'hamstrings', 'calves', 'abs'],
        exercises: [
          { exerciseName: 'Barbell Back Squat', muscleGroup: 'quads', sets: 4, repRangeLow: 5, repRangeHigh: 8 },
          { exerciseName: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 10 },
          { exerciseName: 'Leg Press', muscleGroup: 'quads', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Lying Leg Curl', muscleGroup: 'hamstrings', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Standing Calf Raise', muscleGroup: 'calves', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Hanging Leg Raise', muscleGroup: 'abs', sets: 3, repRangeLow: 8, repRangeHigh: 15 },
        ],
      },
      {
        dayLabel: 'Upper B',
        muscleGroups: ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps'],
        exercises: [
          { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Lateral Raise', muscleGroup: 'side_delts', sets: 3, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Face Pull', muscleGroup: 'rear_delts', sets: 2, repRangeLow: 12, repRangeHigh: 20 },
          { exerciseName: 'Cable Flye', muscleGroup: 'chest', sets: 3, repRangeLow: 10, repRangeHigh: 15 },
          { exerciseName: 'Hammer Curl', muscleGroup: 'biceps', sets: 2, repRangeLow: 8, repRangeHigh: 12 },
          { exerciseName: 'Overhead Tricep Extension', muscleGroup: 'triceps', sets: 2, repRangeLow: 10, repRangeHigh: 15 },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding exercise catalog...');

  // Insert exercises (skip if already exist)
  const result = await prisma.exerciseCatalog.createMany({
    data: exercises,
    skipDuplicates: true,
  });
  console.log(`Seeded ${result.count} exercises (${exercises.length - result.count} already existed)`);

  // Upsert program templates
  for (const tmpl of programTemplates) {
    await prisma.programTemplate.upsert({
      where: { name: tmpl.name },
      update: tmpl,
      create: tmpl,
    });
  }
  console.log(`Seeded ${programTemplates.length} program templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
