import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

type Status = {
  auth: string;
  firestore: string;
  location: string;
};

export default function HomeScreen() {
  const [status, setStatus] = useState<Status>({
    auth: 'signing in…',
    firestore: '—',
    location: 'requesting…',
  });
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setStatus((s) => ({ ...s, auth: `ok (${user.uid.slice(0, 8)}…)` }));
      try {
        await setDoc(doc(db, 'users', user.uid, 'meta', 'lastSeen'), {
          at: serverTimestamp(),
        });
        setStatus((s) => ({ ...s, firestore: 'ok' }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus((s) => ({ ...s, firestore: `err: ${msg}` }));
      }
    });

    signInAnonymously(auth).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus((s) => ({ ...s, auth: `err: ${msg}` }));
    });

    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus((s) => ({ ...s, location: 'denied' }));
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setStatus((s) => ({ ...s, location: 'ok' }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus((s) => ({ ...s, location: `err: ${msg}` }));
      }
    })();
  }, []);

  return (
    <View style={styles.root}>
      {position ? (
        <MapView
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
          <Marker
            coordinate={{ latitude: position.lat, longitude: position.lng }}
            title="You"
          />
        </MapView>
      ) : (
        <View style={styles.center}>
          <Text>Waiting for location…</Text>
        </View>
      )}
      <View style={styles.statusBar} pointerEvents="none">
        <Text style={styles.statusText}>auth:      {status.auth}</Text>
        <Text style={styles.statusText}>firestore: {status.firestore}</Text>
        <Text style={styles.statusText}>location:  {status.location}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.78)',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
