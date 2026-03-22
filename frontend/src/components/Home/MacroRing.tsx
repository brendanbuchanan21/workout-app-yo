import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { COLORS } from '../../constants/theme';

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  color: string;
  size?: number;
}

export default function MacroRing({ label, current, target, color, size = 64 }: MacroRingProps) {
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.bg_input}
          strokeWidth={4}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringValue}>
        {current}<Text style={styles.ringTarget}>/{target}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ringLabel: {
    color: COLORS.text_secondary,
    fontSize: 10,
    marginTop: 4,
  },
  ringValue: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
  ringTarget: {
    color: COLORS.text_tertiary,
    fontWeight: '400',
  },
});
