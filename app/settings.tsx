import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { DirectionFilter } from '@/lib/geo/types';
import { useLocation } from '@/lib/hooks/useLocation';
import { useSettings } from '@/lib/hooks/useSettings';
import { getPlacesClient, type PlaceSuggestion } from '@/lib/places/google';
import type { PlaceType } from '@/lib/places/types';
import { DEFAULT_SETTINGS } from '@/lib/storage/types';

const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'tourist_attraction', label: 'Tourist attraction' },
  { value: 'park', label: 'Park' },
  { value: 'beach', label: 'Beach' },
  { value: 'museum', label: 'Museum' },
  { value: 'amusement_park', label: 'Amusement park' },
  { value: 'lodging', label: 'Lodging' },
];

const DIRECTION_GRID: DirectionFilter[][] = [
  ['NW', 'N', 'NE'],
  ['W', 'ALL', 'E'],
  ['SW', 'S', 'SE'],
];

export default function SettingsScreen() {
  const { settings, loaded, update } = useSettings();
  const { position } = useLocation();
  const [manualMode, setManualMode] = useState(false);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const showManual = manualMode || settings.homeLocation != null;

  const onToggleUseCurrent = (useCurrent: boolean) => {
    if (useCurrent) {
      setManualMode(false);
      update({ homeLocation: null, homeName: null });
    } else {
      setManualMode(true);
    }
  };

  const onPickPlace = (place: PlaceSuggestion) => {
    update({ homeLocation: place.location, homeName: place.name });
  };

  const onClearHome = () => {
    update({ homeLocation: null, homeName: null });
  };

  const onMinRadius = (v: number) => {
    update({
      minRadiusKm: v,
      maxRadiusKm: Math.max(v, settings.maxRadiusKm),
    });
  };

  const onMaxRadius = (v: number) => {
    update({
      maxRadiusKm: v,
      minRadiusKm: Math.min(v, settings.minRadiusKm),
    });
  };

  const toggleType = (t: PlaceType) => {
    const included = settings.includedTypes.includes(t)
      ? settings.includedTypes.filter((x) => x !== t)
      : [...settings.includedTypes, t];
    update({ includedTypes: included });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="Home location">
        <Row label="Use current location">
          <Switch value={!showManual} onValueChange={onToggleUseCurrent} />
        </Row>
        {showManual && (
          <PlaceSearch
            currentHomeName={settings.homeName}
            currentHomeLocation={settings.homeLocation}
            bias={position}
            onPick={onPickPlace}
            onClear={onClearHome}
          />
        )}
      </Section>

      <Section title="Distance from home (km)">
        <Stepper
          label="Minimum"
          value={settings.minRadiusKm}
          suffix="km"
          step={1}
          min={1}
          max={100}
          onChange={onMinRadius}
        />
        <Stepper
          label="Maximum"
          value={settings.maxRadiusKm}
          suffix="km"
          step={1}
          min={1}
          max={100}
          onChange={onMaxRadius}
        />
      </Section>

      <Section title="Direction">
        <DirectionGrid
          value={settings.direction}
          onChange={(d) => update({ direction: d })}
        />
      </Section>

      <Section title="Place types">
        {PLACE_TYPES.map((t) => (
          <Checkbox
            key={t.value}
            label={t.label}
            checked={settings.includedTypes.includes(t.value)}
            onPress={() => toggleType(t.value)}
          />
        ))}
      </Section>

      <Section title="Minimum rating">
        <Stepper
          value={settings.minRating}
          prefix="★ "
          step={0.5}
          min={1.0}
          max={5.0}
          decimals={1}
          onChange={(v) => update({ minRating: v })}
        />
      </Section>

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={() => update(DEFAULT_SETTINGS)}
      >
        <Text style={styles.resetBtnText}>Reset to defaults</Text>
      </TouchableOpacity>
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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({
  label,
  value,
  prefix,
  suffix,
  step,
  min,
  max,
  decimals = 0,
  onChange,
}: {
  label?: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const dec = () => onChange(clamp(roundTo(value - step, decimals)));
  const inc = () => onChange(clamp(roundTo(value + step, decimals)));
  const display = `${prefix ?? ''}${value.toFixed(decimals)}${suffix ? ` ${suffix}` : ''}`;
  return (
    <View style={styles.stepperRow}>
      {label ? <Text style={styles.rowLabel}>{label}</Text> : null}
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={dec}
          disabled={value <= min}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{display}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={inc}
          disabled={value >= max}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function roundTo(v: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}

function DirectionGrid({
  value,
  onChange,
}: {
  value: DirectionFilter;
  onChange: (d: DirectionFilter) => void;
}) {
  return (
    <View style={styles.dirGrid}>
      {DIRECTION_GRID.map((row, i) => (
        <View key={i} style={styles.dirRow}>
          {row.map((d) => {
            const active = value === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dirCell, active && styles.dirCellActive]}
                onPress={() => onChange(d)}
              >
                <Text
                  style={[
                    styles.dirCellText,
                    active && styles.dirCellTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Checkbox({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PlaceSearch({
  currentHomeName,
  currentHomeLocation,
  bias,
  onPick,
  onClear,
}: {
  currentHomeName: string | null;
  currentHomeLocation: { lat: number; lng: number } | null;
  bias: { lat: number; lng: number } | null;
  onPick: (place: PlaceSuggestion) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const client = getPlacesClient();
        const results = await client.searchText(text.trim(), bias ?? undefined);
        setSuggestions(results);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /network request failed/i.test(msg)
            ? 'No internet — connect to search for places.'
            : 'Search failed. Try again.',
        );
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const pick = (place: PlaceSuggestion) => {
    onPick(place);
    setQuery('');
    setSuggestions([]);
    setError(null);
  };

  return (
    <View style={{ gap: 8 }}>
      {currentHomeLocation ? (
        <View style={styles.currentHomeBox}>
          <View style={styles.currentHomeText}>
            <Text style={styles.currentHomeLabel}>Current home</Text>
            <Text style={styles.currentHomeName} numberOfLines={2}>
              {currentHomeName ?? `${currentHomeLocation.lat.toFixed(4)}, ${currentHomeLocation.lng.toFixed(4)}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onClear} hitSlop={8} style={styles.clearBtn}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={onChangeQuery}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" /> : null}
      </View>

      {error ? <Text style={styles.searchError}>{error}</Text> : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionList}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.suggestionRow}
              onPress={() => pick(s)}
            >
              <MaterialIcons name="place" size={18} color="#0a84ff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {s.name}
                </Text>
                {s.address ? (
                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {s.address}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
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
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { fontSize: 15, color: '#222', flex: 1 },
  input: {
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#d4d8df',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: 'white',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef0f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperBtnText: { fontSize: 20, color: '#111', lineHeight: 22 },
  stepperValue: {
    minWidth: 70,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  dirGrid: { gap: 6 },
  dirRow: { flexDirection: 'row', gap: 6 },
  dirCell: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#eef0f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirCellActive: { backgroundColor: '#0a84ff' },
  dirCellText: { fontSize: 13, fontWeight: '600', color: '#444' },
  dirCellTextActive: { color: 'white' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c0c4cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0a84ff',
    borderColor: '#0a84ff',
  },
  checkmark: { color: 'white', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { fontSize: 15, color: '#222', flex: 1 },
  resetBtn: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: { color: '#b00', fontSize: 15, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d4d8df',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 4,
  },
  searchError: { fontSize: 13, color: '#b00' },
  suggestionList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  suggestionName: { fontSize: 14, color: '#111', fontWeight: '500' },
  suggestionAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  currentHomeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e9f1ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currentHomeText: { flex: 1 },
  currentHomeLabel: { fontSize: 11, color: '#0a84ff', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentHomeName: { fontSize: 14, color: '#111', fontWeight: '500', marginTop: 2 },
  clearBtn: { padding: 4 },
});
