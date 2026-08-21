const EARTH_RADIUS_METERS = 6_371_000;
function toRadians(value) {
    return (value * Math.PI) / 180;
}
export function calculateDistanceMeters(latitude1, longitude1, latitude2, longitude2) {
    const latitudeDifference = toRadians(latitude2 - latitude1);
    const longitudeDifference = toRadians(longitude2 - longitude1);
    const firstLatitude = toRadians(latitude1);
    const secondLatitude = toRadians(latitude2);
    const a = Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitude) *
            Math.cos(secondLatitude) *
            Math.sin(longitudeDifference / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(EARTH_RADIUS_METERS * c);
}
export function isInsideGeofence(distanceMeters, allowedRadiusMeters) {
    return distanceMeters <= allowedRadiusMeters;
}
//# sourceMappingURL=geofence.js.map