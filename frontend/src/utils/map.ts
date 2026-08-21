/**
 * Map utility functions
 */

/**
 * Open Google Maps with the specified coordinates
 * @param latitude - Latitude as a string
 * @param longitude - Longitude as a string
 */
export const openLocation = (latitude: string | null, longitude: string | null): void => {
  if (!latitude || !longitude) return;
  const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
  window.open(url, '_blank');
};