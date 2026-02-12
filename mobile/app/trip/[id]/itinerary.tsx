import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addPlaceToItinerary,
  deleteFlight,
  deleteLodging,
  getPlaceDetails,
  getTrip,
  mapGoogleTypesToPlaceType,
  savePlaceToTrip,
  searchPlaces,
  removeItineraryItem,
  extractCity
} from "@/src/api/trips";
import { ApiError } from "@/src/api/client";
import { AppCard } from "@/src/components/ui/AppCard";
import { DayChip } from "@/src/components/ui/DayChip";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { TagPill } from "@/src/components/ui/TagPill";
import { Place } from "@/src/types/models";
import { border, colors, radii, spacing } from "@/src/theme/tokens";
import { formatDate, formatDayChip } from "@/src/utils/date";

function normalizeTripId(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function mapDetailToPlace(detail: NonNullable<Awaited<ReturnType<typeof getPlaceDetails>>["result"]>): Place {
  const photoRef = detail.photos?.[0]?.photo_reference;
  const imageUrl = photoRef
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000"}/api/google/photo?reference=${encodeURIComponent(photoRef)}&maxwidth=800`
    : "";

  return {
    id: detail.place_id,
    googlePlaceId: detail.place_id,
    name: detail.name,
    address: detail.formatted_address,
    type: mapGoogleTypesToPlaceType(detail.types),
    rating: detail.rating,
    userRatingsTotal: detail.user_ratings_total,
    image: imageUrl,
    priceLevel: detail.price_level,
    website: detail.website,
    lat: detail.geometry?.location?.lat,
    lng: detail.geometry?.location?.lng,
    city: extractCity(detail.address_components),
    editorialSummary: detail.editorial_summary?.overview,
    openingHours: detail.opening_hours?.weekday_text ?? detail.current_opening_hours?.weekday_text,
    formattedPhoneNumber: detail.formatted_phone_number || detail.international_phone_number
  };
}

export default function ItineraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripId = normalizeTripId(params.id);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId)
  });

  const locationBias = useMemo(() => {
    if (!tripQuery.data?.lat || !tripQuery.data?.lng) return undefined;
    return { lat: tripQuery.data.lat, lng: tripQuery.data.lng };
  }, [tripQuery.data?.lat, tripQuery.data?.lng]);

  const placesQuery = useQuery({
    queryKey: ["google-autocomplete", tripId, query, locationBias?.lat, locationBias?.lng],
    queryFn: () => searchPlaces(query, locationBias),
    enabled: query.trim().length > 2 && isSearchOpen,
    staleTime: 10_000
  });

  const addPlaceMutation = useMutation({
    mutationFn: async (placeId: string) => {
      const detailsResponse = await getPlaceDetails(placeId);
      if (!detailsResponse.result) {
        throw new Error("Place details not found");
      }

      const placePayload = mapDetailToPlace(detailsResponse.result);
      const savedPlace = await savePlaceToTrip(tripId, placePayload);
      await addPlaceToItinerary(tripId, selectedDayIndex, savedPlace.id);
    },
    onSuccess: async () => {
      setSearchOpen(false);
      setQuery("");
      setSearchError(null);
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setSearchError(error.message);
      } else {
        setSearchError("Unable to add place.");
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { dayIndex: number; itemId: string; itemType?: string; sourceId?: string }) => {
      if (payload.itemType === "flight" && payload.sourceId) {
        await deleteFlight(tripId, payload.sourceId);
        return;
      }

      if (payload.itemType === "lodging" && payload.sourceId) {
        await deleteLodging(tripId, payload.sourceId);
        return;
      }

      await removeItineraryItem(tripId, payload.dayIndex, payload.itemId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    }
  });

  if (tripQuery.isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (tripQuery.isError || !tripQuery.data) {
    return (
      <View style={styles.screen}>
        <AppCard>
          <Text style={styles.errorText}>Unable to load trip itinerary.</Text>
        </AppCard>
      </View>
    );
  }

  const trip = tripQuery.data;
  const safeSelectedDayIndex = Math.max(0, Math.min(selectedDayIndex, trip.itinerary.length - 1));
  const selectedDay = trip.itinerary[safeSelectedDayIndex];

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Text style={styles.iconText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Itinerary</Text>
        <Link href={`/trip/${tripId}/logistics`} asChild>
          <Pressable style={styles.iconButton}>
            <Text style={styles.iconText}>{"="}</Text>
          </Pressable>
        </Link>
      </View>

      <SectionHeader title={trip.title} actionLabel={formatDate(selectedDay?.date ?? trip.startDate)} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayChipRow}>
        {trip.itinerary.map((day, index) => {
          const formatted = formatDayChip(day.date);
          return (
            <DayChip
              key={`${day.date}-${index}`}
              weekday={formatted.weekday}
              day={formatted.day}
              selected={index === safeSelectedDayIndex}
              onPress={() => setSelectedDayIndex(index)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.toolbar}>
        <TagPill label="Plan Day" tone="yellow" />
        <PrimaryButton label="Add Place" tone="mint" onPress={() => setSearchOpen(true)} style={styles.addButton} />
      </View>

      <FlatList
        data={selectedDay?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const place = trip.places[item.placeId];
          if (!place) {
            return null;
          }

          return (
            <AppCard style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTime}>{item.startTime || "Flexible"}</Text>
                <TagPill
                  label={item.itemType === "lodging" ? "Lodging" : item.itemType === "flight" ? "Flight" : "Activity"}
                  tone={item.itemType === "flight" ? "lavender" : item.itemType === "lodging" ? "mint" : "surface"}
                />
              </View>

              <Text style={styles.itemTitle}>{place.name}</Text>
              {place.address ? <Text style={styles.itemSubtitle}>{place.address}</Text> : null}
              {item.notes ? <Text style={styles.itemNote}>{item.notes}</Text> : null}

              <View style={styles.itemActions}>
                <Pressable
                  onPress={() =>
                    deleteMutation.mutate({
                      dayIndex: safeSelectedDayIndex,
                      itemId: item.id,
                      itemType: item.itemType,
                      sourceId: item.sourceId
                    })
                  }
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
            </AppCard>
          );
        }}
        ListEmptyComponent={
          <AppCard>
            <Text style={styles.emptyTitle}>No items for this day</Text>
            <Text style={styles.emptyBody}>Use Add Place to pull a location from Google and schedule it.</Text>
          </AppCard>
        }
      />

      <Modal visible={isSearchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add place to itinerary</Text>

            <TextInput
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setSearchError(null);
              }}
              placeholder="Search places..."
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />

            {placesQuery.isFetching ? <ActivityIndicator color={colors.text} /> : null}

            <FlatList
              data={placesQuery.data?.predictions ?? []}
              keyExtractor={(item) => item.place_id}
              style={styles.resultsList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultRow}
                  onPress={() => addPlaceMutation.mutate(item.place_id)}
                  disabled={addPlaceMutation.isPending}
                >
                  <Text style={styles.resultTitle}>{item.structured_formatting?.main_text || "Unknown place"}</Text>
                  {item.structured_formatting?.secondary_text ? (
                    <Text style={styles.resultSubtitle}>{item.structured_formatting.secondary_text}</Text>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                query.trim().length < 3 ? (
                  <Text style={styles.emptyBody}>Type at least 3 characters to search.</Text>
                ) : (
                  <Text style={styles.emptyBody}>No places found.</Text>
                )
              }
            />

            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

            <PrimaryButton label="Close" tone="mint" onPress={() => setSearchOpen(false)} />
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
    paddingTop: 56,
    paddingBottom: spacing.lg
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: radii.pill,
    borderColor: colors.outline,
    borderWidth: border.normal,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: colors.text
  },
  screenTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 34,
    color: colors.text
  },
  dayChipRow: {
    marginTop: spacing.md,
    maxHeight: 122
  },
  toolbar: {
    marginVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  addButton: {
    minWidth: 140
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md
  },
  itemCard: {
    backgroundColor: colors.surface
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  itemTime: {
    fontFamily: "WorkSans_700Bold",
    fontSize: 18,
    color: colors.text
  },
  itemTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs
  },
  itemSubtitle: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 16,
    color: colors.mutedText
  },
  itemNote: {
    marginTop: spacing.sm,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 15,
    color: colors.text
  },
  itemActions: {
    marginTop: spacing.md,
    alignItems: "flex-end"
  },
  removeButton: {
    borderWidth: border.normal,
    borderColor: colors.outline,
    borderRadius: radii.pill,
    backgroundColor: colors.accentLavender,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  removeButtonText: {
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
    maxHeight: "88%",
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  modalTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    color: colors.text,
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
  resultsList: {
    maxHeight: 300
  },
  resultRow: {
    borderWidth: border.thin,
    borderColor: colors.outline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    marginBottom: spacing.sm
  },
  resultTitle: {
    fontFamily: "WorkSans_700Bold",
    fontSize: 16,
    color: colors.text
  },
  resultSubtitle: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 14,
    color: colors.mutedText
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
    fontFamily: "WorkSans_400Regular",
    fontSize: 15,
    color: colors.mutedText
  }
});
