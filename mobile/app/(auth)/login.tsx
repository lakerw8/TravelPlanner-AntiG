import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppCard } from "@/src/components/ui/AppCard";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { border, colors, radii, spacing } from "@/src/theme/tokens";
import { useAuth } from "@/src/providers/AuthProvider";

export default function LoginScreen() {
  const { session, loading, authError, signInWithGoogle } = useAuth();

  if (!loading && session) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.subtitle}>Use Google to access your travel planner.</Text>

      <AppCard style={styles.authCard}>
        <PrimaryButton label="Continue with Google" onPress={() => void signInWithGoogle()} />
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.text} />
            <Text style={styles.loadingText}>Checking session...</Text>
          </View>
        ) : null}

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedText} />
          <Text style={styles.infoText}>Redirect URI: travelplanner://auth/callback</Text>
        </View>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 120,
    gap: spacing.lg
  },
  title: {
    textAlign: "center",
    fontFamily: "Sora_800ExtraBold",
    fontSize: 44,
    color: colors.text
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "WorkSans_400Regular",
    fontSize: 20,
    color: colors.mutedText
  },
  authCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  loadingText: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.mutedText,
    fontSize: 15
  },
  errorText: {
    color: colors.danger,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 15
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: border.thin,
    borderColor: colors.outline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.card
  },
  infoText: {
    color: colors.mutedText,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 13
  }
});
