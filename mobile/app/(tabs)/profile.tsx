import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/src/components/ui/AppCard";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, spacing } from "@/src/theme/tokens";

export default function ProfileTabScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <AppCard style={styles.card}>
        <Text style={styles.body}>Profile is a placeholder in this MVP. You can sign out here.</Text>
        <PrimaryButton label="Sign Out" onPress={() => void signOut()} />
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
  card: {
    gap: spacing.md
  },
  body: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 18,
    color: colors.mutedText,
    lineHeight: 26
  }
});
