import { Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppCard } from "@/src/components/ui/AppCard";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { border, colors, radii, spacing } from "@/src/theme/tokens";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.headerIcon}>
        <Ionicons name="paper-plane-outline" size={28} color={colors.text} />
      </View>

      <Text style={styles.title}>Welcome to Flows</Text>
      <Text style={styles.subtitle}>Plan your next adventure with ease.</Text>

      <AppCard style={styles.heroCard}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=1600&auto=format&fit=crop"
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>New Journey</Text>
        </View>
        <Text style={styles.quote}>"Travel is the only thing you buy that makes you richer."</Text>
      </AppCard>

      <PrimaryButton label="Continue" onPress={() => router.push("/(auth)/login")} />
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
  headerIcon: {
    alignSelf: "center",
    width: 82,
    height: 82,
    borderRadius: radii.lg,
    borderWidth: border.normal,
    borderColor: colors.outline,
    backgroundColor: colors.accentMint,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    textAlign: "center",
    fontFamily: "Sora_800ExtraBold",
    fontSize: 42,
    color: colors.text
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "WorkSans_400Regular",
    fontSize: 21,
    color: colors.mutedText,
    marginTop: -4
  },
  heroCard: {
    gap: spacing.md
  },
  heroImage: {
    width: "100%",
    height: 260,
    borderRadius: radii.md,
    borderWidth: border.normal,
    borderColor: colors.outline
  },
  quote: {
    textAlign: "center",
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 24,
    color: colors.mutedText,
    fontStyle: "italic",
    paddingHorizontal: spacing.md,
    lineHeight: 32
  },
  badge: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.xl,
    borderWidth: border.normal,
    borderColor: colors.outline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface
  },
  badgeText: {
    fontFamily: "WorkSans_700Bold",
    color: colors.text,
    fontSize: 18
  }
});
