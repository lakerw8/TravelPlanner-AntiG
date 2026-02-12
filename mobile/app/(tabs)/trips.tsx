import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createTrip, getTrips } from "@/src/api/trips";
import { ApiError } from "@/src/api/client";
import { AppCard } from "@/src/components/ui/AppCard";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { TagPill } from "@/src/components/ui/TagPill";
import { TripSummary } from "@/src/types/models";
import { border, colors, radii, spacing } from "@/src/theme/tokens";
import { formatDateRange } from "@/src/utils/date";

const tripsQueryKey = ["trips"];

interface TripFormState {
  title: string;
  startDate: string;
  endDate: string;
  destination: string;
}

const initialForm: TripFormState = {
  title: "",
  startDate: "",
  endDate: "",
  destination: ""
};

export default function TripsTabScreen() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TripFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const tripsQuery = useQuery({
    queryKey: tripsQueryKey,
    queryFn: getTrips
  });

  const createTripMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: async () => {
      setCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to create trip.");
      }
    }
  });

  const isSubmitDisabled = useMemo(() => {
    return !form.title.trim() || !form.startDate.trim() || !form.endDate.trim();
  }, [form]);

  const handleCreateTrip = () => {
    setFormError(null);
    createTripMutation.mutate({
      title: form.title.trim(),
      destination: form.destination.trim() || undefined,
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim()
    });
  };

  const renderItem = ({ item }: { item: TripSummary }) => (
    <AppCard style={styles.tripCard}>
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.tripImage} resizeMode="cover" />
      ) : (
        <View style={styles.tripImageFallback}>
          <Text style={styles.tripImageFallbackText}>No Cover</Text>
        </View>
      )}

      <View style={styles.tripContent}>
        <Text style={styles.tripTitle}>{item.title}</Text>
        <Text style={styles.tripDates}>{formatDateRange(item.startDate, item.endDate)}</Text>
        {item.destination ? <Text style={styles.destination}>{item.destination}</Text> : null}

        <View style={styles.actionsRow}>
          <Link href={`/trip/${item.id}/itinerary`} asChild>
            <Pressable style={styles.actionPill}>
              <Text style={styles.actionText}>Itinerary</Text>
            </Pressable>
          </Link>

          <Link href={`/trip/${item.id}/logistics`} asChild>
            <Pressable style={[styles.actionPill, styles.actionPillSecondary]}>
              <Text style={styles.actionText}>Logistics</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.screen}>
      <SectionHeader title="My Trips" />

      <View style={styles.heroRow}>
        <TagPill label="iOS MVP" tone="mint" />
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ New Trip</Text>
        </Pressable>
      </View>

      {tripsQuery.isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : tripsQuery.isError ? (
        <AppCard>
          <Text style={styles.errorText}>Failed to load trips. Check API base URL and session.</Text>
        </AppCard>
      ) : (
        <FlatList
          data={tripsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={tripsQuery.isRefetching}
              onRefresh={() => void tripsQuery.refetch()}
              tintColor={colors.text}
            />
          }
          ListEmptyComponent={
            <AppCard>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyBody}>Create your first trip to start planning itinerary and logistics.</Text>
            </AppCard>
          }
        />
      )}

      <Modal visible={isCreateOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Trip</Text>
            <Text style={styles.modalHint}>Use date format YYYY-MM-DD.</Text>

            <TextInput
              value={form.title}
              onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
              placeholder="Trip title"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />

            <TextInput
              value={form.destination}
              onChangeText={(value) => setForm((current) => ({ ...current, destination: value }))}
              placeholder="Destination (optional)"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />

            <TextInput
              value={form.startDate}
              onChangeText={(value) => setForm((current) => ({ ...current, startDate: value }))}
              placeholder="Start date (YYYY-MM-DD)"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="none"
            />

            <TextInput
              value={form.endDate}
              onChangeText={(value) => setForm((current) => ({ ...current, endDate: value }))}
              placeholder="End date (YYYY-MM-DD)"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="none"
            />

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label={createTripMutation.isPending ? "Creating..." : "Create"}
                onPress={handleCreateTrip}
                disabled={isSubmitDisabled || createTripMutation.isPending}
              />
              <PrimaryButton label="Cancel" tone="mint" onPress={() => setCreateOpen(false)} />
            </View>
          </AppCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 56
  },
  heroRow: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  addButton: {
    backgroundColor: colors.navBackground,
    borderColor: colors.outline,
    borderWidth: border.normal,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  addButtonText: {
    color: "#FFFFFF",
    fontFamily: "WorkSans_700Bold",
    fontSize: 15
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  listContent: {
    paddingBottom: 140,
    gap: spacing.md
  },
  tripCard: {
    backgroundColor: colors.surface,
    padding: spacing.md
  },
  tripImage: {
    width: "100%",
    height: 136,
    borderRadius: radii.md,
    borderWidth: border.normal,
    borderColor: colors.outline
  },
  tripImageFallback: {
    width: "100%",
    height: 136,
    borderRadius: radii.md,
    borderWidth: border.normal,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBlue
  },
  tripImageFallbackText: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.text,
    fontSize: 14
  },
  tripContent: {
    marginTop: spacing.md,
    gap: spacing.xs
  },
  tripTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: colors.text
  },
  tripDates: {
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 15,
    color: colors.text
  },
  destination: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 14,
    color: colors.mutedText
  },
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm
  },
  actionPill: {
    flex: 1,
    borderWidth: border.normal,
    borderColor: colors.outline,
    borderRadius: radii.pill,
    backgroundColor: colors.accentMint,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  actionPillSecondary: {
    backgroundColor: colors.accentYellow
  },
  actionText: {
    fontFamily: "WorkSans_700Bold",
    color: colors.text,
    fontSize: 14
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  modalTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 30,
    color: colors.text
  },
  modalHint: {
    fontFamily: "WorkSans_400Regular",
    color: colors.mutedText,
    fontSize: 14,
    marginBottom: spacing.xs
  },
  input: {
    borderWidth: border.normal,
    borderColor: colors.outline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card
  },
  modalActions: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  errorText: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.danger,
    fontSize: 14
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: colors.text
  },
  emptyBody: {
    marginTop: spacing.xs,
    fontFamily: "WorkSans_400Regular",
    color: colors.mutedText,
    fontSize: 15
  }
});
