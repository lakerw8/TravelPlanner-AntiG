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
  createFlight,
  createLodging,
  deleteFlight,
  deleteLodging,
  getPlaceDetails,
  getTrip,
  mapGoogleTypesToPlaceType,
  searchPlaces,
  extractCity
} from "@/src/api/trips";
import { ApiError } from "@/src/api/client";
import { AppCard } from "@/src/components/ui/AppCard";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { TagPill } from "@/src/components/ui/TagPill";
import { Place } from "@/src/types/models";
import { border, colors, radii, spacing } from "@/src/theme/tokens";
import { formatDate } from "@/src/utils/date";

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

interface FlightFormState {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  notes: string;
}

const initialFlightForm: FlightFormState = {
  airline: "",
  flightNumber: "",
  departureAirport: "",
  arrivalAirport: "",
  departureTime: "",
  arrivalTime: "",
  notes: ""
};

interface LodgingFormState {
  checkIn: string;
  checkOut: string;
  notes: string;
}

const initialLodgingForm: LodgingFormState = {
  checkIn: "",
  checkOut: "",
  notes: ""
};

export default function LogisticsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripId = normalizeTripId(params.id);

  const [isFlightOpen, setFlightOpen] = useState(false);
  const [isLodgingOpen, setLodgingOpen] = useState(false);
  const [flightForm, setFlightForm] = useState<FlightFormState>(initialFlightForm);
  const [lodgingForm, setLodgingForm] = useState<LodgingFormState>(initialLodgingForm);
  const [lodgingQuery, setLodgingQuery] = useState("");
  const [lodgingPlace, setLodgingPlace] = useState<Place | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId)
  });

  const placePredictionsQuery = useQuery({
    queryKey: ["logistics-place-search", tripId, lodgingQuery],
    queryFn: () => searchPlaces(lodgingQuery),
    enabled: isLodgingOpen && lodgingQuery.trim().length > 2,
    staleTime: 10_000
  });

  const createFlightMutation = useMutation({
    mutationFn: () =>
      createFlight(tripId, {
        airline: flightForm.airline,
        flightNumber: flightForm.flightNumber,
        departureAirport: flightForm.departureAirport,
        arrivalAirport: flightForm.arrivalAirport,
        departureTime: flightForm.departureTime,
        arrivalTime: flightForm.arrivalTime,
        notes: flightForm.notes
      }),
    onSuccess: async () => {
      setFlightOpen(false);
      setFlightForm(initialFlightForm);
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to create flight.");
      }
    }
  });

  const createLodgingMutation = useMutation({
    mutationFn: async () => {
      if (!lodgingPlace) {
        throw new Error("Select a lodging place first");
      }

      await createLodging(tripId, {
        ...lodgingPlace,
        type: "lodging",
        checkIn: lodgingForm.checkIn,
        checkOut: lodgingForm.checkOut,
        notes: lodgingForm.notes
      });
    },
    onSuccess: async () => {
      setLodgingOpen(false);
      setLodgingForm(initialLodgingForm);
      setLodgingPlace(null);
      setLodgingQuery("");
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to add lodging.");
      }
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (payload: { itemType: "flight" | "lodging"; sourceId: string }) => {
      if (payload.itemType === "flight") {
        await deleteFlight(tripId, payload.sourceId);
      } else {
        await deleteLodging(tripId, payload.sourceId);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    }
  });

  const flattenedItems = useMemo(() => {
    const trip = tripQuery.data;
    if (!trip) return [];

    return trip.itinerary.flatMap((day, dayIndex) =>
      day.items.map((item) => ({
        ...item,
        dayIndex,
        date: day.date,
        place: trip.places[item.placeId]
      }))
    );
  }, [tripQuery.data]);

  const flights = useMemo(() => {
    const byId = new Map<string, (typeof flattenedItems)[number]>();
    flattenedItems.forEach((item) => {
      if (item.itemType !== "flight" || !item.sourceId || !item.place) return;
      if (!byId.has(item.sourceId)) {
        byId.set(item.sourceId, item);
      }
    });
    return Array.from(byId.values());
  }, [flattenedItems]);

  const lodgings = useMemo(() => {
    const byId = new Map<string, (typeof flattenedItems)[number]>();
    flattenedItems.forEach((item) => {
      if (item.itemType !== "lodging" || !item.sourceId || !item.place) return;
      const existing = byId.get(item.sourceId);
      if (!existing || item.subtype === "checkin") {
        byId.set(item.sourceId, item);
      }
    });
    return Array.from(byId.values());
  }, [flattenedItems]);

  const selectLodgingPlaceMutation = useMutation({
    mutationFn: async (placeId: string) => {
      const details = await getPlaceDetails(placeId);
      if (!details.result) {
        throw new Error("Place details not found");
      }
      return mapDetailToPlace(details.result);
    },
    onSuccess: (place) => {
      setLodgingPlace({ ...place, type: "lodging" });
      setErrorMessage(null);
    },
    onError: () => {
      setErrorMessage("Unable to load place details.");
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
          <Text style={styles.errorText}>Unable to load logistics.</Text>
        </AppCard>
      </View>
    );
  }

  const trip = tripQuery.data;

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Text style={styles.iconText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Logistics</Text>
        <Link href={`/trip/${tripId}/itinerary`} asChild>
          <Pressable style={styles.iconButton}>
            <Text style={styles.iconText}>{"="}</Text>
          </Pressable>
        </Link>
      </View>

      <SectionHeader title={trip.title} actionLabel="Confirmed" />

      <View style={styles.actionsRow}>
        <PrimaryButton label="Add Flight" onPress={() => setFlightOpen(true)} style={styles.actionButton} />
        <PrimaryButton label="Add Lodging" tone="mint" onPress={() => setLodgingOpen(true)} style={styles.actionButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Flights</Text>
          {flights.length === 0 ? (
            <AppCard>
              <Text style={styles.emptyBody}>No flights yet.</Text>
            </AppCard>
          ) : (
            flights.map((item) => (
              <AppCard key={item.id} style={styles.logisticsCard}>
                <View style={styles.cardTopRow}>
                  <TagPill label="Flight" tone="lavender" />
                  <Pressable
                    onPress={() =>
                      item.sourceId &&
                      deleteItemMutation.mutate({
                        itemType: "flight",
                        sourceId: item.sourceId
                      })
                    }
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Delete</Text>
                  </Pressable>
                </View>
                <Text style={styles.itemTitle}>{item.place?.name || "Flight"}</Text>
                <Text style={styles.itemSubtitle}>{item.place?.address}</Text>
                <Text style={styles.itemMeta}>{formatDate(item.date)} - {item.startTime || "--"} - {item.endTime || "--"}</Text>
              </AppCard>
            ))
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Lodging</Text>
          {lodgings.length === 0 ? (
            <AppCard>
              <Text style={styles.emptyBody}>No lodging entries yet.</Text>
            </AppCard>
          ) : (
            lodgings.map((item) => (
              <AppCard key={item.id} style={styles.logisticsCard}>
                <View style={styles.cardTopRow}>
                  <TagPill label={item.subtype === "checkout" ? "Check-out" : "Check-in"} tone="mint" />
                  <Pressable
                    onPress={() =>
                      item.sourceId &&
                      deleteItemMutation.mutate({
                        itemType: "lodging",
                        sourceId: item.sourceId
                      })
                    }
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Delete</Text>
                  </Pressable>
                </View>
                <Text style={styles.itemTitle}>{item.place?.name || "Lodging"}</Text>
                <Text style={styles.itemSubtitle}>{item.place?.address}</Text>
                <Text style={styles.itemMeta}>{formatDate(item.date)} - {item.startTime || "--"}</Text>
              </AppCard>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={isFlightOpen} transparent animationType="slide" onRequestClose={() => setFlightOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Flight</Text>
            <Text style={styles.modalHint}>Use ISO datetime format, for example `2026-03-02T09:00:00Z`.</Text>

            <TextInput
              style={styles.input}
              value={flightForm.airline}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, airline: value }))}
              placeholder="Airline"
              placeholderTextColor={colors.mutedText}
            />
            <TextInput
              style={styles.input}
              value={flightForm.flightNumber}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, flightNumber: value }))}
              placeholder="Flight Number"
              placeholderTextColor={colors.mutedText}
            />
            <TextInput
              style={styles.input}
              value={flightForm.departureAirport}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, departureAirport: value }))}
              placeholder="Departure Airport"
              placeholderTextColor={colors.mutedText}
            />
            <TextInput
              style={styles.input}
              value={flightForm.arrivalAirport}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, arrivalAirport: value }))}
              placeholder="Arrival Airport"
              placeholderTextColor={colors.mutedText}
            />
            <TextInput
              style={styles.input}
              value={flightForm.departureTime}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, departureTime: value }))}
              placeholder="Departure Time (ISO)"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={flightForm.arrivalTime}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, arrivalTime: value }))}
              placeholder="Arrival Time (ISO)"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, styles.notesInput]}
              value={flightForm.notes}
              onChangeText={(value) => setFlightForm((current) => ({ ...current, notes: value }))}
              placeholder="Notes"
              placeholderTextColor={colors.mutedText}
              multiline
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label={createFlightMutation.isPending ? "Saving..." : "Save Flight"}
                onPress={() => createFlightMutation.mutate()}
                disabled={createFlightMutation.isPending}
              />
              <PrimaryButton label="Cancel" tone="mint" onPress={() => setFlightOpen(false)} />
            </View>
          </AppCard>
        </View>
      </Modal>

      <Modal visible={isLodgingOpen} transparent animationType="slide" onRequestClose={() => setLodgingOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Lodging</Text>
            <Text style={styles.modalHint}>Search a hotel/place first, then provide check-in/check-out timestamps.</Text>

            <TextInput
              style={styles.input}
              value={lodgingQuery}
              onChangeText={setLodgingQuery}
              placeholder="Search lodging place"
              placeholderTextColor={colors.mutedText}
            />

            {placePredictionsQuery.isFetching ? <ActivityIndicator color={colors.text} /> : null}

            <FlatList
              data={placePredictionsQuery.data?.predictions ?? []}
              keyExtractor={(item) => item.place_id}
              style={styles.resultsList}
              renderItem={({ item }) => (
                <Pressable style={styles.resultRow} onPress={() => selectLodgingPlaceMutation.mutate(item.place_id)}>
                  <Text style={styles.resultTitle}>{item.structured_formatting?.main_text || "Unknown place"}</Text>
                  {item.structured_formatting?.secondary_text ? (
                    <Text style={styles.resultSubtitle}>{item.structured_formatting.secondary_text}</Text>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                lodgingQuery.trim().length < 3 ? (
                  <Text style={styles.emptyBody}>Type at least 3 characters to search.</Text>
                ) : (
                  <Text style={styles.emptyBody}>No places found.</Text>
                )
              }
            />

            {lodgingPlace ? (
              <View style={styles.selectedPlaceBox}>
                <Text style={styles.selectedPlaceTitle}>{lodgingPlace.name}</Text>
                <Text style={styles.selectedPlaceSubtitle}>{lodgingPlace.address || "No address"}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              value={lodgingForm.checkIn}
              onChangeText={(value) => setLodgingForm((current) => ({ ...current, checkIn: value }))}
              placeholder="Check-in (ISO, e.g. 2026-03-02T15:00:00Z)"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={lodgingForm.checkOut}
              onChangeText={(value) => setLodgingForm((current) => ({ ...current, checkOut: value }))}
              placeholder="Check-out (ISO, e.g. 2026-03-05T11:00:00Z)"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={lodgingForm.notes}
              onChangeText={(value) => setLodgingForm((current) => ({ ...current, notes: value }))}
              placeholder="Notes"
              placeholderTextColor={colors.mutedText}
              multiline
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label={createLodgingMutation.isPending ? "Saving..." : "Save Lodging"}
                onPress={() => createLodgingMutation.mutate()}
                disabled={createLodgingMutation.isPending || !lodgingPlace}
              />
              <PrimaryButton label="Cancel" tone="mint" onPress={() => setLodgingOpen(false)} />
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
  actionsRow: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  sectionBlock: {
    gap: spacing.sm
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    color: colors.text
  },
  logisticsCard: {
    backgroundColor: colors.surface,
    gap: spacing.xs
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  itemTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.xs
  },
  itemSubtitle: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 15,
    color: colors.mutedText
  },
  itemMeta: {
    marginTop: spacing.xs,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 14,
    color: colors.text
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
    fontSize: 13
  },
  emptyBody: {
    fontFamily: "WorkSans_400Regular",
    color: colors.mutedText,
    fontSize: 15
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  modalTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    color: colors.text
  },
  modalHint: {
    fontFamily: "WorkSans_400Regular",
    color: colors.mutedText,
    fontSize: 13
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
  notesInput: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  errorText: {
    fontFamily: "WorkSans_600SemiBold",
    color: colors.danger,
    fontSize: 14
  },
  resultsList: {
    maxHeight: 180
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
    color: colors.text,
    fontSize: 15
  },
  resultSubtitle: {
    fontFamily: "WorkSans_400Regular",
    color: colors.mutedText,
    fontSize: 13
  },
  selectedPlaceBox: {
    borderWidth: border.normal,
    borderColor: colors.outline,
    borderRadius: radii.md,
    backgroundColor: colors.accentMint,
    padding: spacing.md
  },
  selectedPlaceTitle: {
    fontFamily: "WorkSans_700Bold",
    color: colors.text,
    fontSize: 16
  },
  selectedPlaceSubtitle: {
    marginTop: spacing.xs,
    fontFamily: "WorkSans_400Regular",
    color: colors.text,
    fontSize: 14
  }
});
