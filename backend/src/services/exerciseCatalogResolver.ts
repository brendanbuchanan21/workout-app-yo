import prisma from '../utils/prisma';

type ResolveExerciseCatalogIdInput = {
  userId: string;
  exerciseName: string;
  catalogId?: string | null;
};

export async function resolveExerciseCatalogId({
  userId,
  exerciseName,
  catalogId,
}: ResolveExerciseCatalogIdInput): Promise<string> {
  if (catalogId) {
    const existing = await prisma.exerciseCatalog.findFirst({
      where: {
        id: catalogId,
        OR: [{ isDefault: true }, { userId }],
      },
      select: { id: true },
    });

    if (existing) return existing.id;
  }

  const matches = await prisma.exerciseCatalog.findMany({
    where: {
      name: exerciseName,
      OR: [{ isDefault: true }, { userId }],
    },
    select: { id: true, userId: true, isDefault: true },
  });

  const preferred =
    matches.find((entry) => entry.userId === userId) ??
    matches.find((entry) => entry.isDefault);

  if (preferred) return preferred.id;

  throw new Error(`No exercise catalog entry found for "${exerciseName}"`);
}
