import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useKnownPlaces } from '@/lib/hooks/useKnownPlaces';
import { useLocation } from '@/lib/hooks/useLocation';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSurprise } from '@/lib/hooks/useSurprise';
import { estimateDriveMinutes } from '@/lib/places/drive';
import type { RankedPlace } from '@/lib/places/filter';
import { getPlacesClient } from '@/lib/places/google';

export default function HomeScreen() {
  const router = useRouter();
  const { position, status: locStatus, error: locError } = useLocation();
  const { settings } = useSettings();
  const { state, surprise, again, dismiss } = useSurprise({
    origin: position,
    settings,
  });
  const known = useKnownPlaces();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (state.kind === 'success' && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: state.place.location.lat,
          longitude: state.place.location.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500,
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, [state]);

  const onSurprisePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    surprise();
  };

  const onAgainPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    again();
  };

  const onIllGoPress = async (place: RankedPlace) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await known.recordVisit({
      placeId: place.id,
      name: place.name,
      location: place.location,
    });
    dismiss();
  };

  const onHeartPress = (place: RankedPlace) => {
    Haptics.selectionAsync().catch(() => {});
    if (known.savedIds.has(place.id)) {
      known.removeSave(place.id);
    } else {
      known.recordSave({
        placeId: place.id,
        name: place.name,
        location: place.location,
      });
    }
  };

  if (locStatus === 'requesting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Locating…</Text>
      </View>
    );
  }

  if (locStatus === 'denied' || !position) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          Location permission is required to find places nearby.
        </Text>
        {locError ? <Text style={styles.errorText}>{locError}</Text> : null}
      </View>
    );
  }

  const isLoading = state.kind === 'loading';
  const isSuccess = state.kind === 'success';

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: position.lat,
          longitude: position.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {known.visited.map((p) => (
          <Marker
            key={`visited-${p.placeId}`}
            coordinate={{ latitude: p.location.lat, longitude: p.location.lng }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.visitedDot} />
          </Marker>
        ))}
        {isSuccess && (
          <Marker
            coordinate={{
              latitude: state.place.location.lat,
              longitude: state.place.location.lng,
            }}
            title={state.place.name}
            description={`${state.place.distanceKm.toFixed(1)} km away`}
          />
        )}
      </MapView>

      {!isSuccess && (
        <TouchableOpacity
          style={styles.gear}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
        >
          <MaterialIcons name="settings" size={24} color="#222" />
        </TouchableOpacity>
      )}

      {!isSuccess && (
        <TouchableOpacity
          style={[styles.fab, isLoading && styles.fabLoading]}
          onPress={onSurprisePress}
          disabled={isLoading}
          accessibilityLabel="Surprise me"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.fabText}>Surprise me</Text>
          )}
        </TouchableOpacity>
      )}

      {state.kind === 'empty' && (
        <Toast tone="info" onDismiss={dismiss}>
          No places match the current filters near you. Open Settings to widen the radius, pick a different direction, or enable more types.
        </Toast>
      )}

      {state.kind === 'error' && (
        <Toast tone="error" onDismiss={dismiss}>
          {state.message}
        </Toast>
      )}

      {isSuccess && (
        <ResultCard
          place={state.place}
          isSaved={known.savedIds.has(state.place.id)}
          onHeart={() => onHeartPress(state.place)}
          onShare={() => shareViaSheet(state.place)}
          onOpenMaps={() => openInMaps(state.place)}
          onIllGo={() => onIllGoPress(state.place)}
          onAgain={onAgainPress}
          onClose={dismiss}
        />
      )}
    </View>
  );
}

function Toast({
  children,
  tone,
  onDismiss,
}: {
  children: string;
  tone: 'info' | 'error';
  onDismiss: () => void;
}) {
  return (
    <View style={[styles.toast, tone === 'error' && styles.toastError]}>
      <Text style={styles.toastText}>{children}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Text style={styles.toastDismiss}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultCard({
  place,
  isSaved,
  onHeart,
  onShare,
  onOpenMaps,
  onIllGo,
  onAgain,
  onClose,
}: {
  place: RankedPlace;
  isSaved: boolean;
  onHeart: () => void;
  onShare: () => void;
  onOpenMaps: () => void;
  onIllGo: () => void;
  onAgain: () => void;
  onClose: () => void;
}) {
  const photoUri = (() => {
    if (!place.photoName) return null;
    try {
      return getPlacesClient().photoUrl(place.photoName, 800);
    } catch {
      return null;
    }
  })();

  const driveMin = estimateDriveMinutes(place.distanceKm);

  const metaParts: string[] = [];
  if (place.primaryType) metaParts.push(humanizeType(place.primaryType));
  if (place.rating) metaParts.push(`★ ${place.rating.toFixed(1)}`);

  return (
    <View style={styles.resultCard}>
      <View style={styles.photoContainer}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <MaterialIcons name="image" size={36} color="#bbb" />
          </View>
        )}
        <TouchableOpacity
          style={[styles.iconChip, styles.iconChipLeft]}
          onPress={onHeart}
          hitSlop={8}
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save for later'}
        >
          <MaterialIcons
            name={isSaved ? 'favorite' : 'favorite-border'}
            size={20}
            color={isSaved ? '#ff3b6b' : '#444'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconChip, styles.iconChipRight]}
          onPress={onShare}
          hitSlop={8}
          accessibilityLabel="Share"
        >
          <MaterialIcons name="share" size={20} color="#444" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.resultName} numberOfLines={2}>
          {place.name}
        </Text>
        <View style={styles.metaRow}>
          {metaParts.length > 0 ? (
            <Text style={styles.metaText}>{metaParts.join('  ·  ')}</Text>
          ) : null}
          {place.openNow !== undefined ? (
            <View style={styles.openBadge}>
              <View
                style={[
                  styles.openDot,
                  place.openNow ? styles.openDotOpen : styles.openDotClosed,
                ]}
              />
              <Text style={styles.openText}>
                {place.openNow ? 'Open now' : 'Closed'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.metaSecondary}>
          ~{driveMin} min drive  ·  {place.distanceKm.toFixed(1)} km
        </Text>

        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={onOpenMaps}
          >
            <Text style={styles.btnSecondaryText}>Open in Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onIllGo}
          >
            <Text style={styles.btnPrimaryText}>I&apos;ll go!</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={onAgain} hitSlop={8}>
            <Text style={styles.footerLink}>Surprise me again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.footerLinkMuted}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function shareViaSheet(place: RankedPlace) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`;
  Share.share({
    message: `Surprise Visit suggests: ${place.name}\n${url}`,
  }).catch(() => {});
}

function openInMaps(place: RankedPlace) {
  const q = encodeURIComponent(place.name);
  const url = `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${place.id}`;
  Linking.openURL(url).catch(() => {});
}

function humanizeType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centerText: { fontSize: 15, color: '#333', textAlign: 'center' },
  errorText: { color: '#b00', fontSize: 13, textAlign: 'center' },
  gear: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#0a84ff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    minWidth: 140,
    alignItems: 'center',
  },
  fabLoading: { opacity: 0.75 },
  fabText: { color: 'white', fontSize: 16, fontWeight: '600' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: 'rgba(0,0,0,0.88)',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  toastError: { backgroundColor: 'rgba(139,0,0,0.92)' },
  toastText: { color: 'white', fontSize: 14, lineHeight: 20 },
  toastDismiss: { color: '#9cf', fontSize: 14, fontWeight: '600' },
  resultCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#eef0f3',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f3',
  },
  iconChip: {
    position: 'absolute',
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  iconChipLeft: { left: 8 },
  iconChipRight: { right: 8 },
  cardBody: { padding: 14, gap: 6 },
  resultName: { fontSize: 18, fontWeight: '700', color: '#111' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: { fontSize: 13, color: '#444' },
  metaSecondary: { fontSize: 12, color: '#777' },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f4f5f7',
  },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  openDotOpen: { backgroundColor: '#1a9f4a' },
  openDotClosed: { backgroundColor: '#999' },
  openText: { fontSize: 12, color: '#333', fontWeight: '500' },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0a84ff' },
  btnPrimaryText: { color: 'white', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#eef0f3' },
  btnSecondaryText: { color: '#111', fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  footerLink: { color: '#0a84ff', fontSize: 13, fontWeight: '500' },
  footerLinkMuted: { color: '#888', fontSize: 13 },
  visitedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a9f4a',
    borderWidth: 2,
    borderColor: 'white',
  },
});
