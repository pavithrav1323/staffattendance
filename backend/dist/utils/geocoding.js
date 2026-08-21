const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL ||
    "https://nominatim.openstreetmap.org";
function cleanPart(part) {
    if (!part)
        return null;
    const trimmed = part.trim();
    if (trimmed.length === 0)
        return null;
    return trimmed;
}
function dedupeAndJoin(parts) {
    const seen = new Set();
    const result = [];
    for (const part of parts) {
        if (!part)
            continue;
        const lower = part.toLowerCase();
        if (seen.has(lower))
            continue;
        seen.add(lower);
        result.push(part);
    }
    return result.join(", ");
}
function extractPlaceName(data, address) {
    const topName = cleanPart(data.name);
    if (topName)
        return topName;
    const placeName = cleanPart(address.name) ||
        cleanPart(address.amenity) ||
        cleanPart(address.office) ||
        cleanPart(address.shop) ||
        cleanPart(address.tourism) ||
        cleanPart(address.building) ||
        cleanPart(address.house_name) ||
        null;
    return placeName;
}
function buildLocationName(data, address) {
    const placeName = extractPlaceName(data, address);
    const road = cleanPart(address.road) ||
        cleanPart(address.pedestrian);
    const area = cleanPart(address.suburb) ||
        cleanPart(address.neighbourhood);
    const city = cleanPart(address.city) ||
        cleanPart(address.town) ||
        cleanPart(address.village) ||
        cleanPart(address.municipality);
    const parts = [];
    if (placeName)
        parts.push(placeName);
    if (road) {
        parts.push(road);
    }
    else if (area) {
        parts.push(area);
    }
    if (city) {
        const cityLower = city.toLowerCase();
        const placeNameLower = placeName?.toLowerCase() || "";
        const roadLower = road?.toLowerCase() || "";
        if (cityLower !== placeNameLower &&
            !roadLower.includes(cityLower)) {
            parts.push(city);
        }
    }
    if (parts.length > 0) {
        return dedupeAndJoin(parts);
    }
    const fallback = cleanPart(data.display_name) ||
        cleanPart(address.display_name);
    if (fallback) {
        return fallback;
    }
    return null;
}
export async function reverseGeocode(latitude, longitude) {
    const emptyResult = {
        displayName: null,
        building: null,
        road: null,
        area: null,
        city: null,
        state: null,
        country: null,
    };
    try {
        const url = new URL("/reverse", NOMINATIM_BASE_URL);
        url.searchParams.set("lat", latitude.toString());
        url.searchParams.set("lon", longitude.toString());
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("zoom", "18");
        const requestUrl = url.toString();
        console.log("[Geocoding] coords:", latitude, longitude);
        console.log("[Geocoding] URL:", requestUrl);
        const response = await fetch(requestUrl, {
            headers: {
                "User-Agent": "StaffTrackerGeo/1.0",
                "Accept-Language": "en-US,en",
                Accept: "application/json",
            },
        });
        console.log("[Geocoding] status:", response.status);
        if (!response.ok) {
            console.error(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
            return emptyResult;
        }
        const data = (await response.json());
        console.log("[Geocoding] raw response:", JSON.stringify(data));
        console.log("[Geocoding] address:", JSON.stringify(data.address));
        if (!data || !data.address) {
            console.log("[Geocoding] no address data returned");
            return emptyResult;
        }
        const address = data.address;
        const displayName = buildLocationName(data, address);
        console.log("[Geocoding] displayName:", displayName);
        return {
            displayName,
            building: cleanPart(address.building) ||
                cleanPart(address.house_name) ||
                null,
            road: cleanPart(address.road) ||
                cleanPart(address.pedestrian) ||
                null,
            area: cleanPart(address.suburb) ||
                cleanPart(address.neighbourhood) ||
                null,
            city: cleanPart(address.city) ||
                cleanPart(address.town) ||
                cleanPart(address.village) ||
                cleanPart(address.municipality) ||
                null,
            state: cleanPart(address.state) || null,
            country: cleanPart(address.country) || null,
        };
    }
    catch (error) {
        console.error("[Geocoding] fetch/parse error:", error);
        return emptyResult;
    }
}
//# sourceMappingURL=geocoding.js.map