import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
}

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? <Text style={styles.action}>{actionLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 32,
    color: colors.text
  },
  action: {
    fontFamily: "WorkSans_700Bold",
    fontSize: 18,
    color: colors.text,
    textDecorationLine: "underline"
  }
});
