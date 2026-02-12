import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = "/Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG";

function read(relPath) {
    return readFileSync(resolve(root, relPath), "utf8");
}

test("Trips API maps DB rows to camelCase summary contract", () => {
    const route = read("app/api/trips/route.ts");
    assert.match(route, /mapTripRowToSummary/);
    assert.match(route, /\.eq\("user_id", auth\.user\.id\)/);
    assert.match(route, /startDate/);
    assert.match(route, /coverImage/);
});

test("Trip-scoped APIs enforce authenticated ownership checks", () => {
    const itineraryRoute = read("app/api/trips/[id]/itinerary/route.ts");
    const placeRoute = read("app/api/trips/[id]/places/route.ts");
    const tripDetailRoute = read("app/api/trips/[id]/route.ts");

    assert.match(itineraryRoute, /requireAuthenticatedUser/);
    assert.match(itineraryRoute, /userOwnsTrip/);
    assert.match(placeRoute, /requireAuthenticatedUser/);
    assert.match(placeRoute, /userOwnsTrip/);
    assert.match(tripDetailRoute, /requireAuthenticatedUser/);
    assert.match(tripDetailRoute, /userOwnsTrip/);
});

test("Auth helper supports bearer token auth for mobile clients", () => {
    const authFile = read("lib/auth.ts");
    assert.match(authFile, /authorization/i);
    assert.match(authFile, /bearer/i);
    assert.match(authFile, /if \(bearerToken\)/);
    assert.match(authFile, /return getCookieValue\(request\.headers\.get\("cookie"\), ACCESS_TOKEN_COOKIE\)/);
});

test("Itinerary reorder route persists deterministic ordering", () => {
    const reorderRoute = read("app/api/trips/[id]/itinerary/reorder/route.ts");
    assert.match(reorderRoute, /order_index/);
    assert.match(reorderRoute, /itemId/);
    assert.match(reorderRoute, /destIndex/);
});

test("Flight and lodging delete endpoints exist", () => {
    assert.equal(existsSync(resolve(root, "app/api/trips/[id]/flights/[flightId]/route.ts")), true);
    assert.equal(existsSync(resolve(root, "app/api/trips/[id]/lodging/[lodgingId]/route.ts")), true);
});

test("Trip detail route uses timezone-safe date-only math", () => {
    const tripDetailRoute = read("app/api/trips/[id]/route.ts");
    assert.match(tripDetailRoute, /diffDaysBetweenDateOnly/);
    assert.match(tripDetailRoute, /addDaysToDateOnly/);
    assert.doesNotMatch(tripDetailRoute, /toISOString\(\)\.split\("T"\)\[0\]/);
});
