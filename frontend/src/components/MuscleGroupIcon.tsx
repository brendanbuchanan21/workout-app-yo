import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

import { COLORS } from '../constants/theme';

const MUTED = COLORS.bg_input;

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#E8912D',
  back: '#60A5FA',
  quads: '#4ADE80',
  hamstrings: '#34D399',
  glutes: '#2DD4BF',
  side_delts: '#A78BFA',
  rear_delts: '#818CF8',
  front_delts: '#C084FC',
  biceps: '#F472B6',
  triceps: '#FB923C',
  calves: '#FBBF24',
  abs: '#F87171',
  traps: '#38BDF8',
};

interface MuscleGroupIconProps {
  muscle: string;
  size?: number;
}

export default function MuscleGroupIcon({ muscle, size = 36 }: MuscleGroupIconProps) {
  const highlight = MUSCLE_COLORS[muscle] || COLORS.accent_primary;
  const scale = size / 36;

  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      {/* Head */}
      <Circle
        cx="18" cy="5" r="3.5"
        fill={muscle === 'traps' ? highlight : MUTED}
      />
      {/* Neck / Traps */}
      <Path
        d="M16 8.5 L20 8.5 L21.5 11 L14.5 11 Z"
        fill={muscle === 'traps' ? highlight : MUTED}
      />
      {/* Left Shoulder / Delt */}
      <Path
        d="M14.5 11 L10 12 L9.5 15 L13 14 Z"
        fill={['side_delts', 'rear_delts', 'front_delts'].includes(muscle) ? highlight : MUTED}
      />
      {/* Right Shoulder / Delt */}
      <Path
        d="M21.5 11 L26 12 L26.5 15 L23 14 Z"
        fill={['side_delts', 'rear_delts', 'front_delts'].includes(muscle) ? highlight : MUTED}
      />
      {/* Chest — upper pec shape, wider at top */}
      <Path
        d="M13 14 Q14 13, 18 13.5 Q22 13, 23 14 L22.5 18 Q18 19.5, 13.5 18 Z"
        fill={muscle === 'chest' ? highlight : MUTED}
      />
      {/* Abs / Core — below chest */}
      <Path
        d="M14 18.5 L22 18.5 L21.5 26 L14.5 26 Z"
        fill={muscle === 'abs' ? highlight : MUTED}
      />
      {/* Back — V-taper lat shape, narrow top wide bottom */}
      {muscle === 'back' && (
        <>
          <Path
            d="M15.5 14 L20.5 14 L23 24 L13 24 Z"
            fill={highlight}
          />
          <Path
            d="M12 15 L14 14 L13 22 L10.5 18 Z"
            fill={highlight}
            opacity={0.7}
          />
          <Path
            d="M22 14 L24 15 L25.5 18 L23 22 Z"
            fill={highlight}
            opacity={0.7}
          />
        </>
      )}
      {/* Left Upper Arm — Bicep/Tricep */}
      <Path
        d="M9.5 15 L11.5 15 L11 22 L8.5 22 Z"
        fill={['biceps', 'triceps'].includes(muscle) ? highlight : MUTED}
      />
      {/* Right Upper Arm — Bicep/Tricep */}
      <Path
        d="M24.5 15 L26.5 15 L27.5 22 L25 22 Z"
        fill={['biceps', 'triceps'].includes(muscle) ? highlight : MUTED}
      />
      {/* Left Forearm */}
      <Path
        d="M8.5 22 L11 22 L10.5 28 L8 28 Z"
        fill={MUTED}
      />
      {/* Right Forearm */}
      <Path
        d="M25 22 L27.5 22 L28 28 L25.5 28 Z"
        fill={MUTED}
      />
      {/* Left Glute / Upper Leg */}
      <Path
        d="M14.5 26 L18 26 L17 30 L13.5 30 Z"
        fill={muscle === 'glutes' ? highlight : MUTED}
      />
      {/* Right Glute / Upper Leg */}
      <Path
        d="M18 26 L21.5 26 L22.5 30 L19 30 Z"
        fill={muscle === 'glutes' ? highlight : MUTED}
      />
      {/* Left Quad */}
      <Path
        d="M13.5 30 L17 30 L16.5 36 L13 36 Z"
        fill={['quads', 'hamstrings'].includes(muscle) ? highlight : MUTED}
      />
      {/* Right Quad */}
      <Path
        d="M19 30 L22.5 30 L23 36 L19.5 36 Z"
        fill={['quads', 'hamstrings'].includes(muscle) ? highlight : MUTED}
      />
      {/* Left Calf (behind lower quad) */}
      {muscle === 'calves' && (
        <>
          <Path d="M13 36 L16.5 36 L16.5 33 L13.5 33 Z" fill={highlight} />
          <Path d="M19.5 36 L23 36 L22.5 33 L19 33 Z" fill={highlight} />
        </>
      )}
    </Svg>
  );
}

export { MUSCLE_COLORS };
