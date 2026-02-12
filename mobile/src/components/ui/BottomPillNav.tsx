import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { border, colors, radii, spacing } from "@/src/theme/tokens";

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  trips: "home",
  saved: "heart-outline",
  profile: "person-outline"
};

export function BottomPillNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options.title !== undefined
                ? options.title
                : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Ionicons
                name={iconByRoute[route.name] ?? "ellipse-outline"}
                size={22}
                color={focused ? colors.navBackground : colors.navIcon}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg
  },
  nav: {
    flexDirection: "row",
    backgroundColor: colors.navBackground,
    borderColor: colors.outline,
    borderWidth: border.normal,
    borderRadius: radii.pill,
    padding: spacing.sm
  },
  item: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.pill,
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },
  itemActive: {
    backgroundColor: colors.navActive
  },
  label: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.navIcon,
    fontSize: 12,
    textTransform: "capitalize"
  },
  labelActive: {
    color: colors.navBackground
  }
});
