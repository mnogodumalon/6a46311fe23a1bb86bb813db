// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Vertraege {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vertragsbezeichnung?: string;
    vertragsnummer?: string;
    kategorie?: LookupValue;
    status?: LookupValue;
    partner?: string; // applookup -> URL zu 'Partner' Record
    ansprechpartner?: string; // applookup -> URL zu 'Ansprechpartner' Record
    jahresvolumen?: number;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    kuendigungsfrist?: LookupValue;
    kuendigungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    vertragsdokument?: string;
    notizen?: string;
  };
}

export interface Partner {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    branche?: LookupValue;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    webseite?: string;
    notizen?: string;
  };
}

export interface Ansprechpartner {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    position?: string;
    email_ap?: string;
    telefon_ap?: string;
    partner?: string; // applookup -> URL zu 'Partner' Record
  };
}

export const APP_IDS = {
  VERTRAEGE: '6a46310befb6490de8bc48c2',
  PARTNER: '6a463107a68c98dae897d235',
  ANSPRECHPARTNER: '6a46310a1a639283f3347b68',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'vertraege': {
    kategorie: [{ key: "dienstleistung", label: "Dienstleistung" }, { key: "liefervertrag", label: "Liefervertrag" }, { key: "lizenzvertrag", label: "Lizenzvertrag" }, { key: "mietvertrag", label: "Mietvertrag" }, { key: "wartungsvertrag", label: "Wartungsvertrag" }, { key: "rahmenvertrag", label: "Rahmenvertrag" }, { key: "kooperationsvertrag", label: "Kooperationsvertrag" }, { key: "sonstiges", label: "Sonstiges" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "in_verhandlung", label: "In Verhandlung" }, { key: "ruhend", label: "Ruhend" }, { key: "gekuendigt", label: "Gekündigt" }, { key: "abgelaufen", label: "Abgelaufen" }, { key: "entwurf", label: "Entwurf" }],
    kuendigungsfrist: [{ key: "zwei_wochen", label: "2 Wochen" }, { key: "ein_monat", label: "1 Monat" }, { key: "zwei_monate", label: "2 Monate" }, { key: "drei_monate", label: "3 Monate" }, { key: "sechs_monate", label: "6 Monate" }, { key: "zwoelf_monate", label: "12 Monate" }, { key: "keine", label: "Keine" }],
  },
  'partner': {
    branche: [{ key: "it_software", label: "IT & Software" }, { key: "finanzen_versicherung", label: "Finanzen & Versicherung" }, { key: "logistik_transport", label: "Logistik & Transport" }, { key: "handel_retail", label: "Handel & Retail" }, { key: "produktion_industrie", label: "Produktion & Industrie" }, { key: "beratung_dienstleistung", label: "Beratung & Dienstleistung" }, { key: "gesundheit_pharma", label: "Gesundheit & Pharma" }, { key: "medien_marketing", label: "Medien & Marketing" }, { key: "bau_immobilien", label: "Bau & Immobilien" }, { key: "sonstige", label: "Sonstige" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'vertraege': {
    'vertragsbezeichnung': 'string/text',
    'vertragsnummer': 'string/text',
    'kategorie': 'lookup/select',
    'status': 'lookup/select',
    'partner': 'applookup/select',
    'ansprechpartner': 'applookup/select',
    'jahresvolumen': 'number',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'kuendigungsfrist': 'lookup/select',
    'kuendigungsdatum': 'date/date',
    'vertragsdokument': 'file',
    'notizen': 'string/textarea',
  },
  'partner': {
    'firmenname': 'string/text',
    'branche': 'lookup/select',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'webseite': 'string/url',
    'notizen': 'string/textarea',
  },
  'ansprechpartner': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'position': 'string/text',
    'email_ap': 'string/email',
    'telefon_ap': 'string/tel',
    'partner': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVertraege = StripLookup<Vertraege['fields']>;
export type CreatePartner = StripLookup<Partner['fields']>;
export type CreateAnsprechpartner = StripLookup<Ansprechpartner['fields']>;