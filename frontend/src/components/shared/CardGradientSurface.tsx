import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { COLORS } from '../../constants/theme';

interface CardGradientSurfaceProps {
  /** Unique prefix for SVG gradient defs (non-word chars stripped). */
  gradientId: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Dark diagonal fill matching Progress PR / exercise list cards (bg_secondary → bg_primary + soft sheen).
 */
export function CardGradientSurface({ gradientId, children, style }: CardGradientSurfaceProps) {
  const id = gradientId.replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <View style={[styles.wrap, style]}>
      <Svg style={styles.svg} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${id}Bg`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLORS.bg_secondary} stopOpacity="1" />
            <Stop offset="1" stopColor={COLORS.bg_primary} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id={`${id}Sheen`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.text_primary} stopOpacity="0.016" />
            <Stop offset="0.34" stopColor={COLORS.text_primary} stopOpacity="0.005" />
            <Stop offset="1" stopColor={COLORS.text_primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}Bg)`} />
        <Rect x="0" y="0" width="100%" height="48%" fill={`url(#${id}Sheen)`} />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.bg_primary,
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
  },
});
