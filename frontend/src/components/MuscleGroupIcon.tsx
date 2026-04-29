import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { COLORS } from '../constants/theme';

const OUTLINE = COLORS.text_secondary;
const HIGHLIGHT = COLORS.accent_primary;
const HIGHLIGHT_SUBTLE = COLORS.accent_subtle;

interface MuscleGroupIconProps {
  muscle: string;
  size?: number;
  framed?: boolean;
  background?: boolean;
}

function Frame() {
  return <Circle cx="18" cy="18" r="16" stroke={OUTLINE} strokeWidth="1.4" fill="none" opacity="0.85" />;
}

function FrontOutline() {
  return (
    <>
      <Path d="M15.6 6.5 C16.7 5.4 19.3 5.4 20.4 6.5" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M12 9.2 L24 9.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <Path d="M13 9.2 C10.6 10.3 8.7 13.1 8.4 16.5 L8.4 24.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M23 9.2 C25.4 10.3 27.3 13.1 27.6 16.5 L27.6 24.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M12.6 10.4 C13.8 13.9 14.4 19 14.5 26.2" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M23.4 10.4 C22.2 13.9 21.6 19 21.5 26.2" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M14.9 26.1 L21.1 26.1" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function BackOutline() {
  return (
    <>
      <Path d="M15.6 6.5 C16.7 5.4 19.3 5.4 20.4 6.5" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M12 9.2 L24 9.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <Path d="M13 9.2 C10.6 10.3 8.7 13.3 8.4 16.8 L8.4 24.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M23 9.2 C25.4 10.3 27.3 13.3 27.6 16.8 L27.6 24.2" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M18 9.6 L18 25.8" stroke={OUTLINE} strokeWidth="1.05" fill="none" strokeLinecap="round" opacity="0.7" />
      <Path d="M14.3 11.4 C15.6 15.2 15.8 20.1 15.6 25.3" stroke={OUTLINE} strokeWidth="1.05" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M21.7 11.4 C20.4 15.2 20.2 20.1 20.4 25.3" stroke={OUTLINE} strokeWidth="1.05" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M14.9 26.1 L21.1 26.1" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function LegOutline() {
  return (
    <>
      <Path d="M12 9.5 L24 9.5" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M13.2 9.5 C11.1 10.7 9.5 13.4 9.5 16.7 L9.5 21.5" stroke={OUTLINE} strokeWidth="1.15" fill="none" strokeLinecap="round" />
      <Path d="M22.8 9.5 C24.9 10.7 26.5 13.4 26.5 16.7 L26.5 21.5" stroke={OUTLINE} strokeWidth="1.15" fill="none" strokeLinecap="round" />
      <Path d="M14.1 14.2 L16.1 28.2" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M21.9 14.2 L19.9 28.2" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M16.1 28.2 L14.7 32.3" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M19.9 28.2 L21.3 32.3" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M14.7 32.3 L13.8 34.1" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M21.3 32.3 L22.2 34.1" stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </>
  );
}

function FlexArmOutline() {
  return (
    <>
      <Path d="M10.2 20.8 C12.4 18.9 14.5 18.2 16.9 18.4" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M16.9 18.4 C18.6 16.8 18.9 14.8 18.8 12.3" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M18.8 12.3 C20.7 11.5 22.8 12.3 24 14.4" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M24 14.4 C24.9 16.1 25 18.1 24.5 20.2" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M16.9 18.4 C18.7 20 20.6 21.2 23.2 21.1" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M23.2 21.1 C24.8 21 26 21.6 26.8 23.2" stroke={OUTLINE} strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <Path d="M10.5 20.9 C9.4 22.1 8.8 23.3 8.5 24.9" stroke={OUTLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75" />
    </>
  );
}

function ChestHighlights() {
  return (
    <>
      <Path d="M12.1 10.2 C14.6 9.6 16.9 9.6 17.6 11.6 L17.2 16.5 C15.4 17 13.3 16.8 11.3 15.7 L10.8 12.3 C10.7 11.3 11.1 10.6 12.1 10.2 Z" fill={HIGHLIGHT} />
      <Path d="M23.9 10.2 C21.4 9.6 19.1 9.6 18.4 11.6 L18.8 16.5 C20.6 17 22.7 16.8 24.7 15.7 L25.2 12.3 C25.3 11.3 24.9 10.6 23.9 10.2 Z" fill={HIGHLIGHT} />
    </>
  );
}

function ShoulderHighlights() {
  return (
    <>
      <Path d="M9.6 11.5 C10.6 10.2 12.4 9.6 14.2 10.1 L13.3 14.5 C11.1 14.6 9.6 13.7 9 12.5 Z" fill={HIGHLIGHT} />
      <Path d="M26.4 11.5 C25.4 10.2 23.6 9.6 21.8 10.1 L22.7 14.5 C24.9 14.6 26.4 13.7 27 12.5 Z" fill={HIGHLIGHT} />
    </>
  );
}

function BackHighlights() {
  return (
    <>
      <Path d="M13 10.6 C14.6 10.2 16.1 10.7 16.6 12.4 L16.2 24 C14.6 23.7 13.1 22.7 11.9 21 L11.3 14.2 C11.2 12.7 11.7 11.2 13 10.6 Z" fill={HIGHLIGHT} />
      <Path d="M23 10.6 C21.4 10.2 19.9 10.7 19.4 12.4 L19.8 24 C21.4 23.7 22.9 22.7 24.1 21 L24.7 14.2 C24.8 12.7 24.3 11.2 23 10.6 Z" fill={HIGHLIGHT} />
      <Path d="M16.5 8.9 C17.1 8.2 17.6 8 18 8 C18.4 8 18.9 8.2 19.5 8.9 L19 11.6 L17 11.6 Z" fill={HIGHLIGHT} />
    </>
  );
}

function RearDeltHighlights() {
  return (
    <>
      <Path d="M10.2 12 C11.3 10.7 12.9 10.2 14.6 10.7 L14.2 14.8 C12.3 15.1 10.8 14.4 9.8 13.1 Z" fill={HIGHLIGHT} />
      <Path d="M25.8 12 C24.7 10.7 23.1 10.2 21.4 10.7 L21.8 14.8 C23.7 15.1 25.2 14.4 26.2 13.1 Z" fill={HIGHLIGHT} />
    </>
  );
}

function TrapHighlights() {
  return (
    <>
      <Path d="M12.7 9.1 C14.5 8.6 16.2 8.4 17.4 9.5 L16.7 13.1 L13.6 12.5 C12.4 12.2 11.7 10.7 12.7 9.1 Z" fill={HIGHLIGHT} />
      <Path d="M23.3 9.1 C21.5 8.6 19.8 8.4 18.6 9.5 L19.3 13.1 L22.4 12.5 C23.6 12.2 24.3 10.7 23.3 9.1 Z" fill={HIGHLIGHT} />
    </>
  );
}

function AbsHighlights() {
  return (
    <>
      <Path d="M15.2 13.9 C16.2 13.4 17.1 13.4 17.8 14.2 L17.6 17.2 C16.9 17.5 16 17.5 15.2 17 Z" fill={HIGHLIGHT} />
      <Path d="M20.8 13.9 C19.8 13.4 18.9 13.4 18.2 14.2 L18.4 17.2 C19.1 17.5 20 17.5 20.8 17 Z" fill={HIGHLIGHT} />
      <Path d="M15.5 18.1 C16.3 17.6 17 17.6 17.6 18.3 L17.3 22.8 C16.5 23.3 15.8 23.2 15.2 22.6 Z" fill={HIGHLIGHT} />
      <Path d="M20.5 18.1 C19.7 17.6 19 17.6 18.4 18.3 L18.7 22.8 C19.5 23.3 20.2 23.2 20.8 22.6 Z" fill={HIGHLIGHT} />
    </>
  );
}

function ArmHighlights({ muscle }: { muscle: string }) {
  if (muscle === 'triceps') {
    return <Path d="M18.3 18.6 C20.8 18 22.4 18.6 23.4 20.3 C22.1 21.1 20.5 21.2 18.9 20.8 C18.3 20.1 18.1 19.4 18.3 18.6 Z" fill={HIGHLIGHT} />;
  }

  return <Path d="M15 18.1 C16.5 16.8 18.6 16.5 20.3 17.6 C20.5 18.9 20 20.2 18.8 21 C17.1 21.2 15.7 20.4 14.7 19.1 Z" fill={HIGHLIGHT} />;
}

function LegHighlights({ muscle }: { muscle: string }) {
  switch (muscle) {
    case 'glutes':
      return (
        <>
          <Path d="M13.4 12.6 C14.9 11.6 16.4 11.7 17.2 13.2 L16.8 17.2 C15.1 17.9 13.5 17.3 12.6 15.8 Z" fill={HIGHLIGHT} />
          <Path d="M22.6 12.6 C21.1 11.6 19.6 11.7 18.8 13.2 L19.2 17.2 C20.9 17.9 22.5 17.3 23.4 15.8 Z" fill={HIGHLIGHT} />
        </>
      );
    case 'hamstrings':
      return (
        <>
          <Path d="M14.1 16.2 C15.3 15.3 16.2 15.5 16.7 16.9 L16.2 26.3 C15.2 27 14.3 26.9 13.4 26.1 Z" fill={HIGHLIGHT} />
          <Path d="M21.9 16.2 C20.7 15.3 19.8 15.5 19.3 16.9 L19.8 26.3 C20.8 27 21.7 26.9 22.6 26.1 Z" fill={HIGHLIGHT} />
        </>
      );
    case 'calves':
      return (
        <>
          <Path d="M14.9 28.3 C15.8 28 16.3 28.6 16.1 29.6 L15.3 33 C14.4 33.5 13.7 33.2 13.4 32.1 Z" fill={HIGHLIGHT} />
          <Path d="M21.1 28.3 C20.2 28 19.7 28.6 19.9 29.6 L20.7 33 C21.6 33.5 22.3 33.2 22.6 32.1 Z" fill={HIGHLIGHT} />
        </>
      );
    default:
      return (
        <>
          <Path d="M13.7 15.2 C15.1 14.3 16.3 14.5 17 16.1 L16.2 25.8 C15 26.8 13.9 26.8 13 25.7 Z" fill={HIGHLIGHT} />
          <Path d="M22.3 15.2 C20.9 14.3 19.7 14.5 19 16.1 L19.8 25.8 C21 26.8 22.1 26.8 23 25.7 Z" fill={HIGHLIGHT} />
        </>
      );
  }
}

export default function MuscleGroupIcon({ muscle, size = 36, framed = true, background = true }: MuscleGroupIconProps) {
  const lowerBodyMuscles = new Set(['quads', 'hamstrings', 'glutes', 'calves']);
  const backViewMuscles = new Set(['back', 'rear_delts', 'traps']);
  const armMuscles = new Set(['biceps', 'triceps']);

  const isLowerBody = lowerBodyMuscles.has(muscle);
  const isBackView = backViewMuscles.has(muscle);
  const isArmView = armMuscles.has(muscle);

  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      {background && <Circle cx="18" cy="18" r="16" fill={HIGHLIGHT_SUBTLE} opacity="0.35" />}
      {framed && <Frame />}

      {isArmView ? <FlexArmOutline /> : isLowerBody ? <LegOutline /> : isBackView ? <BackOutline /> : <FrontOutline />}

      {muscle === 'chest' && <ChestHighlights />}
      {['side_delts', 'front_delts'].includes(muscle) && <ShoulderHighlights />}
      {muscle === 'back' && <BackHighlights />}
      {muscle === 'rear_delts' && <RearDeltHighlights />}
      {muscle === 'traps' && <TrapHighlights />}
      {muscle === 'abs' && <AbsHighlights />}
      {isArmView && <ArmHighlights muscle={muscle} />}
      {isLowerBody && <LegHighlights muscle={muscle} />}
    </Svg>
  );
}
