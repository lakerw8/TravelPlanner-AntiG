import { Pressable, StyleSheet, Text, View } from "react-native";

import { border, colors, radii, spacing } from "@/src/theme/tokens";

interface DayChipProps {
  weekday: string;
  day: string;
  selected?: boolean;
  onPress?: () => void;
}

export function DayChip({ weekday, day, selected = false, onPress }: DayChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.base, selected ? styles.selected : styles.unselected]}>
      <Text style={[styles.weekday, selected && styles.selectedText]}>{weekday}</Text>
      <View style={styles.spacing} />
      <Text style={[styles.day, selected && styles.selectedText]}>{day}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 88,
    height: 108,
    borderRadius: radii.lg,
    borderWidth: border.normal,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  selected: {
    backgroundColor: colors.accentMint
  },
  unselected: {
    backgroundColor: colors.surface
  },
  weekday: {
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 18,
    color: colors.mutedText
  },
  day: {
    fontFamily: "Sora_700Bold",
    fontSize: 38,
    color: colors.text
  },
  selectedText: {
    color: colors.text
  },
  spacing: {
    height: spacing.xs
  }
});
