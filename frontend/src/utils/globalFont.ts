import { Text, TextInput } from 'react-native';
import { Text as SvgText } from 'react-native-svg';

import { FONT } from '../constants/theme';

type WithDefaultStyle = {
  defaultProps?: { style?: unknown };
};

type WithSvgTextDefaults = {
  defaultProps?: { fontFamily?: string; style?: unknown };
};

const baseStyle = { fontFamily: FONT.regular };

function mergeDefaultStyle(existing: unknown): unknown {
  if (existing == null) return baseStyle;
  if (Array.isArray(existing)) return [baseStyle, ...existing];
  return [baseStyle, existing];
}

const RNText = Text as typeof Text & WithDefaultStyle;
const RNTextInput = TextInput as typeof TextInput & WithDefaultStyle;
const RNSvgText = SvgText as typeof SvgText & WithSvgTextDefaults;

RNText.defaultProps = {
  ...RNText.defaultProps,
  style: mergeDefaultStyle(RNText.defaultProps?.style),
};

RNTextInput.defaultProps = {
  ...RNTextInput.defaultProps,
  style: mergeDefaultStyle(RNTextInput.defaultProps?.style),
};

RNSvgText.defaultProps = {
  ...RNSvgText.defaultProps,
  fontFamily: FONT.regular,
};
