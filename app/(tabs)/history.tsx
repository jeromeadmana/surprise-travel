import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useKnownPlaces } from '@/lib/hooks/useKnownPlaces';
import type { KnownPlace } from '@/lib/storage/types';

export default function HistoryScreen() {
  const { visited, saved, loaded, removeVisit, removeSave } = useKnownPlaces();

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Section title="Visited">
        {visited.length === 0 ? (
          <EmptyText>
            Places you mark with &quot;I&apos;ll go!&quot; appear here.
          </EmptyText>
        ) : (
          visited.map((p) => (
            <PlaceRow
              key={`visited-${p.placeId}`}
              place={p}
              timestamp={p.visitedAt ?? null}
              onRemove={() => removeVisit(p.placeId)}
            />
          ))
        )}
      </Section>

      <Section title="Saved">
        {saved.length === 0 ? (
          <EmptyText>
            Places you save with the heart icon appear here.
          </EmptyText>
        ) : (
          saved.map((p) => (
            <PlaceRow
              key={`saved-${p.placeId}`}
              place={p}
              timestamp={p.savedAt ?? null}
              onRemove={() => removeSave(p.placeId)}
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EmptyText({ children }: { children: string }) {
  return <Text style={styles.emptyText}>{children}</Text>;
}

function PlaceRow({
  place,
  timestamp,
  onRemove,
}: {
  place: KnownPlace;
  timestamp: number | null;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => openInMaps(place)}
      activeOpacity={0.7}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {place.name}
        </Text>
        {timestamp ? (
          <Text style={styles.rowMeta}>{relativeTime(timestamp)}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={12}
        style={styles.removeBtn}
      >
        <MaterialIcons name="close" size={20} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function openInMaps(place: KnownPlace) {
  const q = encodeURIComponent(place.name);
  const url = `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${place.placeId}`;
  Linking.openURL(url).catch(() => {});
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  const date = new Date(ts);
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f5f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, color: '#111', fontWeight: '500' },
  rowMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  removeBtn: { padding: 4 },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#888',
  },
});
