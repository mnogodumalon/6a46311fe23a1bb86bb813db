import type { EnrichedAnsprechpartner, EnrichedVertraege } from '@/types/enriched';
import type { Ansprechpartner, Partner, Vertraege } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface VertraegeMaps {
  partnerMap: Map<string, Partner>;
  ansprechpartnerMap: Map<string, Ansprechpartner>;
}

export function enrichVertraege(
  vertraege: Vertraege[],
  maps: VertraegeMaps
): EnrichedVertraege[] {
  return vertraege.map(r => ({
    ...r,
    partnerName: resolveDisplay(r.fields.partner, maps.partnerMap, 'firmenname'),
    ansprechpartnerName: resolveDisplay(r.fields.ansprechpartner, maps.ansprechpartnerMap, 'vorname', 'nachname'),
  }));
}

interface AnsprechpartnerMaps {
  partnerMap: Map<string, Partner>;
}

export function enrichAnsprechpartner(
  ansprechpartner: Ansprechpartner[],
  maps: AnsprechpartnerMaps
): EnrichedAnsprechpartner[] {
  return ansprechpartner.map(r => ({
    ...r,
    partnerName: resolveDisplay(r.fields.partner, maps.partnerMap, 'firmenname'),
  }));
}
