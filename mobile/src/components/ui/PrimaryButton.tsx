import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { border, colors, radii, spacing } from "@/src/theme/tokens";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "dark" | "mint";
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, disabled = false, tone = "dark", style }: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        tone === "dark" ? styles.dark : styles.mint,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.label, tone === "dark" ? styles.darkLabel : styles.mintLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: border.normal,
    borderColor: colors.outline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  dark: {
    backgroundColor: colors.navBackground
  },
  mint: {
    backgroundColor: colors.accentMint
  },
  label: {
    fontFamily: "WorkSans_700Bold",
    fontSize: 18
  },
  darkLabel: {
    color: "#FFFFFF"
  },
  mintLabel: {
    color: colors.text
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.6
  }
});
