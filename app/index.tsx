import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKnownPlaces } from '@/lib/hooks/useKnownPlaces';
import { useLocation } from '@/lib/hooks/useLocation';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSurprise } from '@/lib/hooks/useSurprise';
import { estimateDriveMinutes } from '@/lib/places/drive';
import type { RankedPlace } from '@/lib/places/filter';
import { getPlacesClient } from '@/lib/places/google';
import {
  CATEGORY_LABELS,
  CATEGORY_TYPES,
  type PlaceTypeCategory,
} from '@/lib/places/types';

const CHIP_ORDER: PlaceTypeCategory[] = [
  'food',
  'beach',
  'nature',
  'culture',
  'stay',
  'fun',
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { position, status: locStatus, error: locError } = useLocation();
  const { settings } = useSettings();
  const [activeChip, setActiveChip] = useState<PlaceTypeCategory | null>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const { state, surprise, again, dismiss } = useSurprise({
    origin: position,
    settings,
    typeOverride: activeChip ? CATEGORY_TYPES[activeChip] : undefined,
  });
  const known = useKnownPlaces();
  const mapRef = useRef<MapView | null>(null);

  const anchorLat = settings.homeLocation?.lat ?? position?.lat ?? null;
  const anchorLng = settings.homeLocation?.lng ?? position?.lng ?? null;
  const isSuccess = state.kind === 'success';
  const isLoading = state.kind === 'loading';

  useEffect(() => {
    if (isSuccess && mapRef.current && state.kind === 'success') {
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
  }, [state, isSuccess]);

  useEffect(() => {
    if (isSuccess || !mapRef.current) return;
    if (anchorLat == null || anchorLng == null) return;
    mapRef.current.animateToRegion(
      {
        latitude: anchorLat,
        longitude: anchorLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500,
    );
  }, [anchorLat, anchorLng, isSuccess]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSuccess) {
        dismiss();
        setMenuOpen(true);
        return true;
      }
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [isSuccess, menuOpen, dismiss]);

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
    setMenuOpen(true);
  };

  const onResultClose = () => {
    dismiss();
    setMenuOpen(true);
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

  const onChipPress = (chip: PlaceTypeCategory) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveChip((prev) => (prev === chip ? null : chip));
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

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: settings.homeLocation?.lat ?? position.lat,
          longitude: settings.homeLocation?.lng ?? position.lng,
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

      <Header
        insets={insets}
        menuOpen={menuOpen && !isSuccess}
        onToggle={() => {
          if (isSuccess) {
            dismiss();
            setMenuOpen(true);
            return;
          }
          setMenuOpen((v) => !v);
        }}
      />

      {menuOpen && !isSuccess && (
        <>
          <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <MenuCard
            activeChip={activeChip}
            onChipPress={onChipPress}
            onSurprisePress={onSurprisePress}
            isLoading={isLoading}
            homeName={settings.homeName}
            homeLocation={settings.homeLocation}
            onHistory={() => router.push('/history')}
            onSettings={() => router.push('/settings')}
            onClose={() => setMenuOpen(false)}
          />
        </>
      )}

      {state.kind === 'empty' && (
        <Toast tone="info" onDismiss={dismiss} bottomInset={insets.bottom}>
          {emptyMessage(activeChip)}
        </Toast>
      )}

      {state.kind === 'error' && (
        <Toast tone="error" onDismiss={dismiss} bottomInset={insets.bottom}>
          {state.message}
        </Toast>
      )}

      {isSuccess && (
        <ResultCard
          place={state.place}
          isSaved={known.savedIds.has(state.place.id)}
          bottomInset={insets.bottom}
          onHeart={() => onHeartPress(state.place)}
          onShare={() => shareViaSheet(state.place)}
          onOpenMaps={() => openInMaps(state.place)}
          onIllGo={() => onIllGoPress(state.place)}
          onAgain={onAgainPress}
          onClose={onResultClose}
        />
      )}
    </View>
  );
}

function Header({
  insets,
  menuOpen,
  onToggle,
}: {
  insets: { top: number };
  menuOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}
    >
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.headerLogo}
      />
      <Text style={styles.headerTitle}>Surprise Visit</Text>
      <View style={styles.headerSpacer} />
      <TouchableOpacity
        style={styles.headerMenuBtn}
        onPress={onToggle}
        hitSlop={8}
        accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
      >
        <MaterialIcons
          name={menuOpen ? 'close' : 'menu'}
          size={24}
          color="#0d192e"
        />
      </TouchableOpacity>
    </View>
  );
}

function MenuCard({
  activeChip,
  onChipPress,
  onSurprisePress,
  isLoading,
  homeName,
  homeLocation,
  onHistory,
  onSettings,
  onClose,
}: {
  activeChip: PlaceTypeCategory | null;
  onChipPress: (c: PlaceTypeCategory) => void;
  onSurprisePress: () => void;
  isLoading: boolean;
  homeName: string | null;
  homeLocation: { lat: number; lng: number } | null;
  onHistory: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.menuCard}>
      <TouchableOpacity
        style={styles.menuClose}
        onPress={onClose}
        hitSlop={10}
        accessibilityLabel="Close menu"
      >
        <MaterialIcons name="close" size={20} color="#444" />
      </TouchableOpacity>

      <View style={styles.menuBrand}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.menuLogo}
        />
        <Text style={styles.menuBrandText}>Surprise Visit</Text>
      </View>

      <Text style={styles.menuCopy}>Where to today?</Text>

      {homeLocation ? (
        <TouchableOpacity onPress={onSettings} style={styles.menuHomePill}>
          <MaterialIcons name="place" size={14} color="#0a84ff" />
          <Text style={styles.menuHomePillText} numberOfLines={1}>
            From: {homeName ?? `${homeLocation.lat.toFixed(3)}, ${homeLocation.lng.toFixed(3)}`}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuChipRow}
      >
        {CHIP_ORDER.map((chip) => {
          const isActive = activeChip === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChipPress(chip)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {CATEGORY_LABELS[chip]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.menuPrimaryBtn, isLoading && styles.menuPrimaryBtnLoading]}
        onPress={onSurprisePress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={20} color="white" />
            <Text style={styles.menuPrimaryBtnText}>Surprise me</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.menuDivider} />

      <View style={styles.menuLinks}>
        <TouchableOpacity style={styles.menuLink} onPress={onHistory}>
          <MaterialIcons name="history" size={20} color="#0a84ff" />
          <Text style={styles.menuLinkText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuLink} onPress={onSettings}>
          <MaterialIcons name="settings" size={20} color="#0a84ff" />
          <Text style={styles.menuLinkText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Toast({
  children,
  tone,
  onDismiss,
  bottomInset,
}: {
  children: string;
  tone: 'info' | 'error';
  onDismiss: () => void;
  bottomInset: number;
}) {
  return (
    <View
      style={[
        styles.toast,
        tone === 'error' && styles.toastError,
        { bottom: 32 + bottomInset },
      ]}
    >
      <Text style={styles.toastText}>{children}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Text style={styles.toastDismiss}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

function emptyMessage(activeChip: PlaceTypeCategory | null): string {
  if (activeChip) {
    return `No ${CATEGORY_LABELS[activeChip].replace(/^\S+\s/, '').toLowerCase()} places match the current filters near you. Try clearing the chip, widening the radius in Settings, or picking 'All' directions.`;
  }
  return "No places match the current filters near you. Try widening the radius in Settings or picking 'All' directions.";
}

function ResultCard({
  place,
  isSaved,
  bottomInset,
  onHeart,
  onShare,
  onOpenMaps,
  onIllGo,
  onAgain,
  onClose,
}: {
  place: RankedPlace;
  isSaved: boolean;
  bottomInset: number;
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
    <View style={[styles.resultCard, { bottom: 16 + bottomInset }]}>
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
          style={[styles.iconChip, styles.iconChipRightInner]}
          onPress={onShare}
          hitSlop={8}
          accessibilityLabel="Share"
        >
          <MaterialIcons name="share" size={20} color="#444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconChip, styles.iconChipRightOuter]}
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Close"
        >
          <MaterialIcons name="close" size={20} color="#444" />
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

        <TouchableOpacity
          style={styles.againBtn}
          onPress={onAgain}
          accessibilityLabel="Surprise me again"
        >
          <MaterialIcons name="refresh" size={20} color="white" />
          <Text style={styles.againBtnText}>Surprise me again</Text>
        </TouchableOpacity>
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

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0d192e',
    zIndex: 10,
    elevation: 4,
  },
  headerLogo: { width: 28, height: 28, borderRadius: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0d192e' },
  headerSpacer: { flex: 1 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 20,
  },

  menuCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '14%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 30,
  },
  menuClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f3',
    zIndex: 1,
  },
  menuBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 36,
  },
  menuLogo: { width: 36, height: 36, borderRadius: 8 },
  menuBrandText: { fontSize: 20, fontWeight: '700', color: '#0d192e' },
  menuCopy: { fontSize: 15, color: '#555' },
  menuHomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#e9f1ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: '100%',
  },
  menuHomePillText: { fontSize: 12, color: '#0d192e', fontWeight: '500' },
  menuChipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#eef0f3',
  },
  chipActive: { backgroundColor: '#0a84ff' },
  chipText: { fontSize: 13, color: '#333', fontWeight: '500' },
  chipTextActive: { color: 'white' },
  menuPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a84ff',
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
  },
  menuPrimaryBtnLoading: { opacity: 0.75 },
  menuPrimaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0e3e8' },
  menuLinks: { flexDirection: 'row', gap: 8 },
  menuLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f4f6fa',
  },
  menuLinkText: { fontSize: 14, color: '#0a84ff', fontWeight: '600' },

  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: 'rgba(0,0,0,0.88)',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    zIndex: 25,
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
    zIndex: 25,
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
  iconChipRightInner: { right: 48 },
  iconChipRightOuter: { right: 8 },
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
  againBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0a84ff',
    paddingVertical: 14,
    borderRadius: 10,
  },
  againBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },

  visitedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a9f4a',
    borderWidth: 2,
    borderColor: 'white',
  },
});
