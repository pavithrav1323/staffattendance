import {
  calculateDistanceMeters,
  isInsideGeofence,
} from "./geofence.js";

const distance = calculateDistanceMeters(
  3.139,
  101.6869,
  3.1395,
  101.6872
);

console.log("Distance:", distance, "meters");
console.log("Inside geofence:", isInsideGeofence(distance, 200));