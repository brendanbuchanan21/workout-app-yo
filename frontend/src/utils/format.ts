export function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

export function formatTonnage(kg: number): string {
  const lbs = Math.round(kg * 2.20462);
  if (lbs >= 10000) return `${(lbs / 1000).toFixed(1)}k lbs`;
  return `${lbs.toLocaleString()} lbs`;
}
