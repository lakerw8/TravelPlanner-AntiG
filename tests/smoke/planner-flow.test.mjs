import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = "/Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG";

function read(relPath) {
    return readFileSync(resolve(root, relPath), "utf8");
}

test("Login flow is Supabase Google OAuth based", () => {
    const loginPage = read("app/login/page.tsx");
    const callbackPage = read("app/auth/callback/page.tsx");
    assert.match(loginPage, /signInWithOAuth/);
    assert.match(loginPage, /provider:\s*"google"/);
    assert.match(callbackPage, /exchangeCodeForSession/);
    assert.match(callbackPage, /\/api\/auth\/session/);
});

test("Middleware protects planner routes and trips API", () => {
    const middleware = read("proxy.ts");
    assert.match(middleware, /dashboard/);
    assert.match(middleware, /trip/);
    assert.match(middleware, /api\/trips/);
    assert.match(middleware, /Unauthorized/);
});

test("Trip planner page uses canonical place IDs and item-type delete routes", () => {
    const tripPage = read("app/(main)/trip/[id]/page.tsx");
    assert.match(tripPage, /canonicalPlace/);
    assert.match(tripPage, /\/flights\/\$\{item\.sourceId\}/);
    assert.match(tripPage, /\/lodging\/\$\{item\.sourceId\}/);
    assert.match(tripPage, /itemId:\s*draggableId/);
});

test("Google place routes use Places API (New)", () => {
    const autocompleteRoute = read("app/api/google/autocomplete/route.ts");
    const detailsRoute = read("app/api/google/details/route.ts");
    const photoRoute = read("app/api/google/photo/route.ts");

    assert.match(autocompleteRoute, /places\.googleapis\.com\/v1\/places:autocomplete/);
    assert.match(detailsRoute, /places\.googleapis\.com\/v1\/places/);
    assert.match(photoRoute, /places\.googleapis\.com\/v1/);

    assert.doesNotMatch(autocompleteRoute, /maps\.googleapis\.com\/maps\/api\/place/);
    assert.doesNotMatch(detailsRoute, /maps\.googleapis\.com\/maps\/api\/place/);
    assert.doesNotMatch(photoRoute, /maps\.googleapis\.com\/maps\/api\/place/);
});
