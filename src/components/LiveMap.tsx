// Web: bản đồ Goong qua maplibre-gl. Chỉ tải thư viện khi có maptiles key.
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { HubSeed } from '../data/catalog';
import { goongStyle, hubBounds } from '../lib/maps';
import { c } from '../theme';

export type LiveMapProps = { hubs: HubSeed[]; label: (h: HubSeed) => string; onPick: (slug: string) => void; height?: number };

export function LiveMap({ hubs, label, onPick, height = 220 }: LiveMapProps) {
  const box = useRef<any>(null); const pick = useRef(onPick); pick.current = onPick; const names = hubs.map(label).join('|'); const key = hubs.map((h) => h.slug).join(',');
  useEffect(() => {
    let map: any; let gone = false;
    import('maplibre-gl').then((m: any) => { const ml = m.default ?? m;
      const el = box.current as unknown as HTMLElement | null; if (gone || !el || !hubs.length) return;
      map = new ml.Map({ container: el, style: goongStyle(), bounds: hubBounds(hubs), fitBoundsOptions: { padding: 32, maxZoom: 15 }, attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      for (const h of hubs) {
        const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', label(h)); dot.title = label(h);
        Object.assign(dot.style, { width: '18px', height: '18px', borderRadius: '9px', background: c.son, border: `3px solid ${c.white}`, boxShadow: '0 1px 4px rgba(0,0,0,.35)', cursor: 'pointer', padding: '0' });
        dot.onclick = () => pick.current(h.slug);
        new ml.Marker({ element: dot }).setLngLat([h.lng, h.lat]).addTo(map);
      }
    }).catch(() => {});
    return () => { gone = true; map?.remove(); };
  }, [key, names]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View ref={box} style={{ height, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 8 }} />;
}
