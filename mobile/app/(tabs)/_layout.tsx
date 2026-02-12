import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";

import { BottomPillNav } from "@/src/components/ui/BottomPillNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/tokens";

export default function TabsLayout() {
  const { session, loading } = useAuth();

  // TODO: remove auth bypass when done testing
  return (
    <Tabs
      tabBar={(props) => <BottomPillNav {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  }
});
