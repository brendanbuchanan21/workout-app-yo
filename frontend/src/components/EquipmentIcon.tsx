import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { COLORS } from '../constants/theme';

const EQUIPMENT_ICONS: Record<string, string> = {
  barbell: 'weight-lifter',
  dumbbell: 'dumbbell',
  cable: 'arm-flex-outline',
  machine: 'cog-outline',
  bodyweight: 'human-handsup',
};

interface EquipmentIconProps {
  equipment: string;
  size?: number;
  color?: string;
}

export default function EquipmentIcon({ equipment, size = 20, color = COLORS.text_tertiary }: EquipmentIconProps) {
  const iconName = EQUIPMENT_ICONS[equipment];
  if (!iconName) return null;

  return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
}
