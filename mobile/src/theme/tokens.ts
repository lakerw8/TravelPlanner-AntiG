export const colors = {
  background: "#F4EFE3",
  surface: "#F8F8F8",
  card: "#F2F2F2",
  outline: "#111111",
  text: "#171717",
  mutedText: "#6B7280",
  accentMint: "#8EDFD2",
  accentYellow: "#F4CB78",
  accentLavender: "#DCD0F0",
  accentBlue: "#CFE6F8",
  navBackground: "#07090D",
  navIcon: "#A5ACB8",
  navActive: "#F9E27D",
  danger: "#B42318",
  success: "#0F766E"
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32
} as const;

export const border = {
  thick: 3,
  normal: 2,
  thin: 1
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 0,
    elevation: 5
  }
} as const;
