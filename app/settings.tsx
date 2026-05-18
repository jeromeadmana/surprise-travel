import { useEffect, useRef, useState } from 'react';
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

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const useCurrentLocation = settings.homeLocation == null;

  const onToggleUseCurrent = (useCurrent: boolean) => {
    if (useCurrent) {
      update({ homeLocation: null });
    } else if (position) {
      update({ homeLocation: position });
    }
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
          <Switch value={useCurrentLocation} onValueChange={onToggleUseCurrent} />
        </Row>
        {!useCurrentLocation && settings.homeLocation && (
          <LatLngEditor
            value={settings.homeLocation}
            onChange={(loc) => update({ homeLocation: loc })}
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

function LatLngEditor({
  value,
  onChange,
}: {
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const [latText, setLatText] = useState(String(value.lat));
  const [lngText, setLngText] = useState(String(value.lng));
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (
      value.lat !== lastValueRef.current.lat ||
      value.lng !== lastValueRef.current.lng
    ) {
      const latNum = parseFloat(latText);
      const lngNum = parseFloat(lngText);
      if (latNum !== value.lat || lngNum !== value.lng) {
        setLatText(String(value.lat));
        setLngText(String(value.lng));
      }
    }
    lastValueRef.current = value;
  }, [value, latText, lngText]);

  const onLatChange = (text: string) => {
    setLatText(text);
    const v = parseFloat(text);
    if (Number.isFinite(v)) onChange({ ...value, lat: v });
  };

  const onLngChange = (text: string) => {
    setLngText(text);
    const v = parseFloat(text);
    if (Number.isFinite(v)) onChange({ ...value, lng: v });
  };

  return (
    <>
      <Row label="Latitude">
        <TextInput
          style={styles.input}
          keyboardType="numbers-and-punctuation"
          value={latText}
          onChangeText={onLatChange}
        />
      </Row>
      <Row label="Longitude">
        <TextInput
          style={styles.input}
          keyboardType="numbers-and-punctuation"
          value={lngText}
          onChangeText={onLngChange}
        />
      </Row>
    </>
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
});
