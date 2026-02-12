import { StyleSheet, Text, View } from "react-native";

import { border, colors, radii, spacing } from "@/src/theme/tokens";

interface TagPillProps {
  label: string;
  tone?: "mint" | "yellow" | "lavender" | "surface";
}

export function TagPill({ label, tone = "surface" }: TagPillProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: border.normal,
    borderColor: colors.outline,
    alignSelf: "flex-start"
  },
  label: {
    color: colors.text,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 14
  }
});

const toneStyles = StyleSheet.create({
  mint: {
    backgroundColor: colors.accentMint
  },
  yellow: {
    backgroundColor: colors.accentYellow
  },
  lavender: {
    backgroundColor: colors.accentLavender
  },
  surface: {
    backgroundColor: colors.surface
  }
});
