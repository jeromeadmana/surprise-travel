import type { DirectionFilter, LatLng } from '../geo/types';
import type { PlaceType } from '../places/types';

export type Settings = {
  homeLocation: LatLng | null;
  minRadiusKm: number;
  maxRadiusKm: number;
  direction: DirectionFilter;
  includedTypes: PlaceType[];
  minRating: number;
  minRatingCount: number;
};

export const DEFAULT_SETTINGS: Settings = {
  homeLocation: null,
  minRadiusKm: 5,
  maxRadiusKm: 60,
  direction: 'ALL',
  includedTypes: [
    'cafe',
    'restaurant',
    'tourist_attraction',
    'park',
    'beach',
    'museum',
    'amusement_park',
    'lodging',
  ],
  minRating: 4.0,
  minRatingCount: 10,
};

export type Visit = {
  placeId: string;
  name: string;
  location: LatLng;
  visitedAt: number;
};
