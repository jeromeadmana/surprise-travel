export type LatLng = {
  lat: number;
  lng: number;
};

export type Bearing = number;

export type CompassDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export type DirectionFilter = CompassDirection | 'ALL';
