import type { Ansprechpartner, Vertraege } from './app';

export type EnrichedVertraege = Vertraege & {
  partnerName: string;
  ansprechpartnerName: string;
};

export type EnrichedAnsprechpartner = Ansprechpartner & {
  partnerName: string;
};
