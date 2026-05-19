import type { LatLng } from '../geo/types';

export type PlaceType = string;

export type BusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY'
  | 'BUSINESS_STATUS_UNSPECIFIED';

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
