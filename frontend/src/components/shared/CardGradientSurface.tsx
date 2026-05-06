import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  return (
    <View style={[styles.wrap, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 ? (
        <Svg
          style={styles.svg}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={`${id}Bg`} x1="0" y1="0" x2={size.width} y2={size.height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#18181D" stopOpacity="1" />
              <Stop offset="0.28" stopColor="#16161A" stopOpacity="1" />
              <Stop offset="0.68" stopColor="#141416" stopOpacity="1" />
              <Stop offset="1" stopColor="#0E0E10" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id={`${id}Sheen`} x1="0" y1="0" x2="0" y2={size.height * 0.52} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={COLORS.text_primary} stopOpacity="0.009" />
              <Stop offset="0.38" stopColor={COLORS.text_primary} stopOpacity="0.003" />
              <Stop offset="1" stopColor={COLORS.text_primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.width} height={size.height} fill={`url(#${id}Bg)`} />
          <Rect x="0" y="0" width={size.width} height={size.height * 0.52} fill={`url(#${id}Sheen)`} />
        </Svg>
      ) : null}
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
