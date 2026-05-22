import type { LatLng } from '../geo/types';
import type { BusinessStatus, Place, PlaceType } from './types';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.formattedAddress',
  'places.photos',
  'places.currentOpeningHours.openNow',
].join(',');

const GOOGLE_MAX_RADIUS_M = 50_000;
const GOOGLE_MAX_RESULTS = 20;

export type NearbySearchParams = {
  center: LatLng;
  radiusMeters: number;
  includedTypes?: PlaceType[];
  excludedTypes?: PlaceType[];
  maxResultCount?: number;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
};

export class PlacesApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'PlacesApiError';
  }
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  formattedAddress?: string;
  photos?: Array<{ name: string }>;
  currentOpeningHours?: { openNow?: boolean };
};

type RawResponse = { places?: RawPlace[] };

export class PlacesClient {
  constructor(private readonly apiKey: string) {}

  photoUrl(photoName: string, maxWidthPx: number = 400): string {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${this.apiKey}`;
  }

  async searchNearby(params: NearbySearchParams): Promise<Place[]> {
    const body = {
      includedTypes: params.includedTypes,
      excludedTypes: params.excludedTypes,
      maxResultCount: clamp(
        params.maxResultCount ?? GOOGLE_MAX_RESULTS,
        1,
        GOOGLE_MAX_RESULTS,
      ),
      rankPreference: params.rankPreference ?? 'POPULARITY',
      locationRestriction: {
        circle: {
          center: {
            latitude: params.center.lat,
            longitude: params.center.lng,
          },
          radius: Math.min(GOOGLE_MAX_RADIUS_M, params.radiusMeters),
        },
      },
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PlacesApiError(
        res.status,
        `Places searchNearby failed: HTTP ${res.status} — ${text}`,
      );
    }

    const data = (await res.json()) as RawResponse;
    return (data.places ?? [])
      .map(normalize)
      .filter((p): p is Place => p !== null);
  }
}

function normalize(raw: RawPlace): Place | null {
  if (!raw.id || !raw.location) return null;
  return {
    id: raw.id,
    name: raw.displayName?.text ?? '(unnamed)',
    location: { lat: raw.location.latitude, lng: raw.location.longitude },
    types: raw.types ?? [],
    primaryType: raw.primaryType,
    rating: raw.rating,
    ratingCount: raw.userRatingCount,
    businessStatus:
      (raw.businessStatus as BusinessStatus) ?? 'BUSINESS_STATUS_UNSPECIFIED',
    address: raw.formattedAddress,
    photoName: raw.photos?.[0]?.name,
    openNow: raw.currentOpeningHours?.openNow,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

let cachedClient: PlacesClient | null = null;

export function getPlacesClient(): PlacesClient {
  if (cachedClient) return cachedClient;
  const key = process.env.EXPO_PUBLIC_PLACES_API_KEY;
  if (!key) {
    throw new Error(
      'EXPO_PUBLIC_PLACES_API_KEY is not set — check .env.local or EAS environment variables.',
    );
  }
  cachedClient = new PlacesClient(key);
  return cachedClient;
}
