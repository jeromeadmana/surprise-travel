import type { LatLng } from '../geo/types';

export type PlaceType = string;

export type BusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY'
  | 'BUSINESS_STATUS_UNSPECIFIED';

export type PlaceTypeCategory =
  | 'food'
  | 'beach'
  | 'nature'
  | 'culture'
  | 'stay'
  | 'fun';

export const CATEGORY_TYPES: Record<PlaceTypeCategory, PlaceType[]> = {
  food: ['cafe', 'restaurant'],
  beach: ['beach'],
  nature: ['park'],
  culture: ['museum', 'tourist_attraction'],
  stay: ['lodging'],
  fun: ['amusement_park'],
};

export const CATEGORY_LABELS: Record<PlaceTypeCategory, string> = {
  food: '🍴 Food',
  beach: '🏖 Beach',
  nature: '🏞 Nature',
  culture: '🏛 Culture',
  stay: '🛏 Stay',
  fun: '🎢 Fun',
};

export type Place = {
  id: string;
  name: string;
  location: LatLng;
  types: PlaceType[];
  primaryType?: string;
  rating?: number;
  ratingCount?: number;
  businessStatus: BusinessStatus;
  address?: string;
  photoName?: string;
  openNow?: boolean;
};
