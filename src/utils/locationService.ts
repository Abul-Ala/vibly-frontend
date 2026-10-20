export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  latitude: number;
  longitude: number;
  city: string;
}

class LocationService {
  /**
   * Prompts user for browser geolocation and resolves latitude & longitude
   */
  async getCurrentCoordinates(): Promise<GeoCoordinates> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let msg = 'Failed to detect location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information is currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location detection timed out. Please try again.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * Reverse geocodes latitude & longitude into a clean city / country name
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    // 1. Try BigDataCloud free client reverse geocoding
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision;
        const country = data.countryName || data.countryCode;
        if (city && country) {
          return `${city}, ${country}`;
        } else if (city) {
          return city;
        } else if (country) {
          return country;
        }
      }
    } catch {
      // Fallback below
    }

    // 2. Try OpenStreetMap Nominatim reverse geocode fallback
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state;
        const country = addr.country;
        if (city && country) {
          return `${city}, ${country}`;
        } else if (city) {
          return city;
        }
      }
    } catch {
      // Fallback below
    }

    return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
  }

  /**
   * Detects current coordinates and reverse-geocodes city name in a single call
   */
  async detectLocation(): Promise<LocationResult> {
    const coords = await this.getCurrentCoordinates();
    const city = await this.reverseGeocode(coords.latitude, coords.longitude);
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      city,
    };
  }

  /**
   * Formats distance in km for UI badges
   */
  formatDistance(distanceKm?: number | null, hideDistance?: boolean): string | null {
    if (hideDistance || distanceKm === undefined || distanceKm === null) {
      return null;
    }
    if (distanceKm < 1) {
      return 'Nearby (< 1 km away)';
    }
    return `${Math.round(distanceKm)} km away`;
  }
}

export const locationService = new LocationService();
export default locationService;

export const detectLocation = () => locationService.detectLocation();
export const formatDistance = (distanceKm?: number | null, hideDistance?: boolean) =>
  locationService.formatDistance(distanceKm, hideDistance);
export const getCurrentCoordinates = () => locationService.getCurrentCoordinates();
export const reverseGeocode = (latitude: number, longitude: number) =>
  locationService.reverseGeocode(latitude, longitude);

