import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { border, colors, radii, shadows, spacing } from "@/src/theme/tokens";

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.outline,
    borderWidth: border.normal,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card
  }
});
