import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface PRSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function PRSearchBar({ value, onChangeText }: PRSearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={17} color={COLORS.text_tertiary} style={styles.searchIcon} />
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
      <View style={styles.divider} />
      <Ionicons name="filter" size={18} color={COLORS.text_secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
    color: COLORS.text_primary,
    fontSize: 15,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
});
