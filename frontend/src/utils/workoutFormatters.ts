export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function formatWeight(kg: number, unit: string): string {
  if (unit === 'imperial') {
    return `${Math.round(kg * 2.20462)} lbs`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatTonnage(kg: number, unit: string): string {
  if (unit === 'imperial') {
    const lbs = kg * 2.20462;
    if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k lbs`;
    return `${Math.round(lbs)} lbs`;
  }
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}
