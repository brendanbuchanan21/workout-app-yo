export function validateBirthDate(
  birthMonth: string,
  birthDay: string,
  birthYear: string,
): string | null {
  const m = parseInt(birthMonth);
  const d = parseInt(birthDay);
  const y = parseInt(birthYear);

  if (!birthMonth || !birthDay || !birthYear) return 'Please fill in all date fields';
  if (isNaN(m) || m < 1 || m > 12) return 'Month must be 1-12';
  if (isNaN(d) || d < 1 || d > 31) return 'Day must be 1-31';
  if (isNaN(y) || y < 1920 || y > new Date().getFullYear()) return 'Enter a valid year';

  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return 'That date doesn\'t exist';

  const today = new Date();
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() - (m - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;
  if (age < 13) return 'You must be at least 13 years old';
  if (age > 120) return 'Please enter a valid birth date';

  return null;
}

export function validateBasicsStep(
  displayName: string,
  birthMonth: string,
  birthDay: string,
  birthYear: string,
): string | null {
  if (!displayName.trim()) return 'Please enter your name';
  return validateBirthDate(birthMonth, birthDay, birthYear);
}

export function validateBodyStep(
  heightFeet: string,
  weight: string,
  unitPreference: 'imperial' | 'metric',
): string | null {
  if (unitPreference === 'imperial') {
    if (!heightFeet || isNaN(parseInt(heightFeet))) return 'Please enter your height';
  } else {
    if (!heightFeet || isNaN(parseFloat(heightFeet))) return 'Please enter your height';
  }
  if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) return 'Please enter your weight';
  return null;
}
