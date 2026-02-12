import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/src/components/ui/AppCard";
import { colors, spacing } from "@/src/theme/tokens";

export default function SavedTabScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Saved Collections</Text>
      <AppCard>
        <Text style={styles.body}>Collections is a placeholder in this MVP. Trips and itinerary are fully connected to backend data.</Text>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 72,
    gap: spacing.lg
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 34,
    color: colors.text
  },
  body: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 18,
    color: colors.mutedText,
    lineHeight: 26
  }
});
