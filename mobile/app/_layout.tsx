import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold
} from "@expo-google-fonts/sora";
import { WorkSans_400Regular, WorkSans_600SemiBold, WorkSans_700Bold } from "@expo-google-fonts/work-sans";

import { colors } from "@/src/theme/tokens";
import { AppQueryProvider } from "@/src/providers/QueryProvider";
import { AuthProvider } from "@/src/providers/AuthProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    WorkSans_400Regular,
    WorkSans_600SemiBold,
    WorkSans_700Bold
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppQueryProvider>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: colors.background
                }
              }}
            />
          </AuthProvider>
        </AppQueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  }
});
