import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/tokens";

export default function AuthCallbackScreen() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.text} />
      <Text style={styles.text}>Completing secure sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.background
  },
  text: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.mutedText,
    fontSize: 16
  }
});
