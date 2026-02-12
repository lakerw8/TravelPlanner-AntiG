import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/tokens";

export default function IndexScreen() {
  const { session, loading } = useAuth();

  // TODO: remove auth bypass when done testing
  return <Redirect href="/(tabs)/trips" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  }
});
