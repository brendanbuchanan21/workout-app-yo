import { View, TextInput, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface PRSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function PRSearchBar({ value, onChangeText }: PRSearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search exercises..."
        placeholderTextColor={COLORS.text_tertiary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.text_primary,
    fontSize: 15,
  },
});
