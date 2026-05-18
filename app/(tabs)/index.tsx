import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useLocation } from '@/lib/hooks/useLocation';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSurprise } from '@/lib/hooks/useSurprise';
import type { RankedPlace } from '@/lib/places/filter';

export default function HomeScreen() {
  const router = useRouter();
  const { position, status: locStatus, error: locError } = useLocation();
  const { settings } = useSettings();
  const { state, surprise, again, dismiss } = useSurprise({
    origin: position,
    settings,
  });
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
          No places match the defaults near you. Settings (coming next phase) will let you widen the radius or pick a direction.
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
  onAgain,
  onClose,
}: {
  place: RankedPlace;
  onAgain: () => void;
  onClose: () => void;
}) {
  const meta = [
    place.primaryType ? humanizeType(place.primaryType) : null,
    place.rating ? `★ ${place.rating.toFixed(1)}` : null,
    `${place.distanceKm.toFixed(1)} km`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultName} numberOfLines={2}>
        {place.name}
      </Text>
      <Text style={styles.resultMeta}>{meta}</Text>
      <View style={styles.resultActions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => openInMaps(place)}
        >
          <Text style={styles.btnSecondaryText}>Open in Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={onAgain}
        >
          <Text style={styles.btnPrimaryText}>Surprise me again</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
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
  centerText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    color: '#b00',
    fontSize: 13,
    textAlign: 'center',
  },
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
    padding: 16,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    gap: 6,
  },
  resultName: { fontSize: 18, fontWeight: '700', color: '#111' },
  resultMeta: { fontSize: 13, color: '#555' },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0a84ff' },
  btnPrimaryText: { color: 'white', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#eef0f3' },
  btnSecondaryText: { color: '#111', fontWeight: '600' },
  closeBtn: { alignItems: 'center', paddingVertical: 6 },
  closeText: { color: '#666', fontSize: 13 },
});
