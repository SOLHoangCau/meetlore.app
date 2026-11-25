// iOS/Android: bản đồ Goong qua MapLibre Native.
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Pressable, View } from 'react-native';
import type { HubSeed } from '../data/catalog';
import { goongStyle, hubBounds } from '../lib/maps';
import { c } from '../theme';

export type LiveMapProps = { hubs: HubSeed[]; label: (h: HubSeed) => string; onPick: (slug: string) => void; height?: number };

export function LiveMap({ hubs, label, onPick, height = 220 }: LiveMapProps) {
  if (!hubs.length) return null;
  return <View style={{ height, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 8 }}>
    <Map style={{ flex: 1 }} mapStyle={goongStyle()} logo={false} attribution>
      <Camera initialViewState={{ bounds: hubBounds(hubs), padding: { top: 32, right: 32, bottom: 32, left: 32 } }} maxZoom={17} />
      {hubs.map((h) => <Marker key={h.slug} lngLat={[h.lng, h.lat]} onPress={() => onPick(h.slug)}>
        <Pressable accessibilityRole="button" accessibilityLabel={label(h)} onPress={() => onPick(h.slug)} hitSlop={10}
          style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.son, borderWidth: 3, borderColor: c.white }} />
      </Marker>)}
    </Map>
  </View>;
}
