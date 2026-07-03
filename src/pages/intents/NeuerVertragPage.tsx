import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import type { Partner, Ansprechpartner } from '@/types/app';
import {
  IconBuilding,
  IconUser,
  IconUserOff,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconFileDescription,
  IconCurrencyEuro,
  IconCircleCheck,
  IconPlus,
} from '@tabler/icons-react';

// ─── Wizard steps ────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { label: 'Partner' },
  { label: 'Ansprechpartner' },
  { label: 'Details' },
  { label: 'Bestätigung' },
];

// ─── Form state ───────────────────────────────────────────────────────────────
interface VertragsDetails {
  vertragsbezeichnung: string;
  vertragsnummer: string;
  kategorie: string;
  status: string;
  startdatum: string;
  enddatum: string;
  jahresvolumen: string;
  kuendigungsfrist: string;
  notizen: string;
}

const DEFAULT_DETAILS: VertragsDetails = {
  vertragsbezeichnung: '',
  vertragsnummer: '',
  kategorie: '',
  status: '',
  startdatum: '',
  enddatum: '',
  jahresvolumen: '',
  kuendigungsfrist: '',
  notizen: '',
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

function formatDate(value: string): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function NeuerVertragPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { partner, ansprechpartner, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedAnsprechpartnerId, setSelectedAnsprechpartnerId] = useState<string | null>(null);
  const [skipAnsprechpartner, setSkipAnsprechpartner] = useState(false);
  const [details, setDetails] = useState<VertragsDetails>(DEFAULT_DETAILS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  // Deep-linking: read ?partnerId and ?step from URL on mount
  useEffect(() => {
    const urlPartnerId = searchParams.get('partnerId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);

    if (urlPartnerId) {
      setSelectedPartnerId(urlPartnerId);
      setStep(2);
    } else if (urlStep >= 1 && urlStep <= 4) {
      setStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync step to URL
  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep);
    const params = new URLSearchParams(searchParams);
    if (newStep > 1) {
      params.set('step', String(newStep));
    } else {
      params.delete('step');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Derived data
  const selectedPartner: Partner | undefined = partner.find(p => p.record_id === selectedPartnerId);

  const filteredAnsprechpartner: Ansprechpartner[] = ansprechpartner.filter(ap => {
    if (!selectedPartnerId) return false;
    const apPartnerId = extractRecordId(ap.fields.partner);
    return apPartnerId === selectedPartnerId;
  });

  const selectedAnsprechpartner: Ansprechpartner | undefined = ansprechpartner.find(
    ap => ap.record_id === selectedAnsprechpartnerId
  );

  const kategorieOptions = LOOKUP_OPTIONS['vertraege']?.['kategorie'] ?? [];
  const statusOptions = LOOKUP_OPTIONS['vertraege']?.['status'] ?? [];
  const kuendigungsfristOptions = LOOKUP_OPTIONS['vertraege']?.['kuendigungsfrist'] ?? [];

  // ─── Step 1: Partner auswählen ─────────────────────────────────────────────
  const handleSelectPartner = (id: string) => {
    setSelectedPartnerId(id);
    setSelectedAnsprechpartnerId(null);
    setSkipAnsprechpartner(false);
    handleStepChange(2);
  };

  // ─── Step 2: Ansprechpartner wählen ───────────────────────────────────────
  const handleSelectAnsprechpartner = (id: string) => {
    setSelectedAnsprechpartnerId(id);
    setSkipAnsprechpartner(false);
    handleStepChange(3);
  };

  const handleSkipAnsprechpartner = () => {
    setSelectedAnsprechpartnerId(null);
    setSkipAnsprechpartner(true);
    handleStepChange(3);
  };

  // ─── Step 3 → 4 ──────────────────────────────────────────────────────────
  const handleDetailsNext = () => {
    if (!details.vertragsbezeichnung.trim()) return;
    handleStepChange(4);
  };

  // ─── Step 4: Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedPartnerId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const fields: Record<string, unknown> = {
        vertragsbezeichnung: details.vertragsbezeichnung.trim(),
        partner: createRecordUrl(APP_IDS.PARTNER, selectedPartnerId),
      };

      if (details.vertragsnummer.trim()) fields.vertragsnummer = details.vertragsnummer.trim();
      if (details.kategorie) fields.kategorie = details.kategorie;
      if (details.status) fields.status = details.status;
      if (details.startdatum) fields.startdatum = details.startdatum;
      if (details.enddatum) fields.enddatum = details.enddatum;
      if (details.jahresvolumen) fields.jahresvolumen = parseFloat(details.jahresvolumen);
      if (details.kuendigungsfrist) fields.kuendigungsfrist = details.kuendigungsfrist;
      if (details.notizen.trim()) fields.notizen = details.notizen.trim();

      if (selectedAnsprechpartnerId) {
        fields.ansprechpartner = createRecordUrl(APP_IDS.ANSPRECHPARTNER, selectedAnsprechpartnerId);
      }

      await LivingAppsService.createVertraegeEntry(fields as Parameters<typeof LivingAppsService.createVertraegeEntry>[0]);
      await fetchAll();
      setCreatedName(details.vertragsbezeichnung.trim());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Anlegen des Vertrags');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedPartnerId(null);
    setSelectedAnsprechpartnerId(null);
    setSkipAnsprechpartner(false);
    setDetails(DEFAULT_DETAILS);
    setCreatedName(null);
    setSubmitError(null);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
    setStep(1);
  };

  // ─── Success state ────────────────────────────────────────────────────────
  if (createdName !== null) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <IconArrowLeft size={14} className="shrink-0" />
            Zurück zum Dashboard
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Neuer Vertrag</h1>
        </div>
        <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-green-600" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Vertrag erfolgreich angelegt!</h2>
              <p className="text-muted-foreground mt-1">
                <span className="font-medium text-foreground">„{createdName}"</span> wurde erfolgreich erstellt.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-xs">
              <Button onClick={handleReset} className="flex-1 gap-2">
                <IconPlus size={16} />
                Weiteren Vertrag anlegen
              </Button>
              <a href="#/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Zum Dashboard
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IntentWizardShell
      title="Neuer Vertrag"
      subtitle="Lege in 4 Schritten einen neuen Vertrag an"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Partner ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Partner auswählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle den Partner aus, mit dem der Vertrag geschlossen wird.
            </p>
          </div>
          <EntitySelectStep
            items={partner.map(p => ({
              id: p.record_id,
              title: p.fields.firmenname ?? '(Kein Name)',
              subtitle: [p.fields.branche?.label, p.fields.ort].filter(Boolean).join(' · '),
              icon: <IconBuilding size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectPartner}
            searchPlaceholder="Partner suchen..."
            emptyIcon={<IconBuilding size={32} />}
            emptyText="Kein Partner gefunden."
          />
        </div>
      )}

      {/* ── Step 2: Ansprechpartner ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Context card */}
          {selectedPartner && (
            <div className="rounded-xl border bg-secondary/40 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconBuilding size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Partner</p>
                <p className="text-sm font-semibold truncate">{selectedPartner.fields.firmenname ?? '—'}</p>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base font-semibold text-foreground">Ansprechpartner wählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle einen Ansprechpartner für diesen Vertrag — oder fahre ohne fort.
            </p>
          </div>

          {filteredAnsprechpartner.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
              <IconUserOff size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Keine Ansprechpartner für diesen Partner gefunden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAnsprechpartner.map(ap => (
                <button
                  key={ap.record_id}
                  onClick={() => handleSelectAnsprechpartner(ap.record_id)}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-colors overflow-hidden group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconUser size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {[ap.fields.vorname, ap.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[ap.fields.position, ap.fields.email_ap].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <IconArrowRight size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* "Keinen Ansprechpartner" option */}
          <button
            onClick={handleSkipAnsprechpartner}
            className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-dashed bg-card hover:bg-accent hover:border-primary/30 transition-colors overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <IconUserOff size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Keinen Ansprechpartner angeben
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Kann später ergänzt werden</p>
            </div>
            <IconArrowRight size={16} className="text-muted-foreground shrink-0" />
          </button>

          <div className="flex justify-start pt-1">
            <Button variant="ghost" size="sm" onClick={() => handleStepChange(1)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Vertragsdetails ── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-xl border bg-secondary/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconBuilding size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Partner</p>
                <p className="text-sm font-semibold truncate">{selectedPartner?.fields.firmenname ?? '—'}</p>
              </div>
            </div>
            {!skipAnsprechpartner && selectedAnsprechpartner && (
              <div className="flex items-center gap-3 flex-1 min-w-0 sm:border-l sm:pl-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconUser size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Ansprechpartner</p>
                  <p className="text-sm font-semibold truncate">
                    {[selectedAnsprechpartner.fields.vorname, selectedAnsprechpartner.fields.nachname].filter(Boolean).join(' ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Vertragsdetails eingeben</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fülle die Felder aus. Nur die Bezeichnung ist Pflicht.</p>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            {/* Vertragsbezeichnung */}
            <div className="space-y-1.5">
              <Label htmlFor="vertragsbezeichnung">
                Vertragsbezeichnung <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vertragsbezeichnung"
                placeholder="z. B. Softwarelizenz Adobe 2025"
                value={details.vertragsbezeichnung}
                onChange={e => setDetails(d => ({ ...d, vertragsbezeichnung: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Vertragsnummer */}
            <div className="space-y-1.5">
              <Label htmlFor="vertragsnummer">Vertragsnummer</Label>
              <Input
                id="vertragsnummer"
                placeholder="z. B. VTR-2025-001"
                value={details.vertragsnummer}
                onChange={e => setDetails(d => ({ ...d, vertragsnummer: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Kategorie + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kategorie</Label>
                <Select value={details.kategorie} onValueChange={val => setDetails(d => ({ ...d, kategorie: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategorieOptions.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={details.status} onValueChange={val => setDetails(d => ({ ...d, status: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start- und Enddatum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startdatum">Startdatum</Label>
                <Input
                  id="startdatum"
                  type="date"
                  value={details.startdatum}
                  onChange={e => setDetails(d => ({ ...d, startdatum: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enddatum">Enddatum</Label>
                <Input
                  id="enddatum"
                  type="date"
                  value={details.enddatum}
                  onChange={e => setDetails(d => ({ ...d, enddatum: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Jahresvolumen */}
            <div className="space-y-1.5">
              <Label htmlFor="jahresvolumen">Jahresvolumen (€)</Label>
              <div className="relative">
                <IconCurrencyEuro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="jahresvolumen"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={details.jahresvolumen}
                  onChange={e => setDetails(d => ({ ...d, jahresvolumen: e.target.value }))}
                  className="w-full pl-9"
                />
              </div>
              {details.jahresvolumen && (
                <p className="text-xs text-muted-foreground">
                  Vertragswert: <span className="font-semibold text-foreground">{formatCurrency(details.jahresvolumen)}</span> / Jahr
                </p>
              )}
            </div>

            {/* Kündigungsfrist */}
            <div className="space-y-1.5">
              <Label>Kündigungsfrist</Label>
              <Select value={details.kuendigungsfrist} onValueChange={val => setDetails(d => ({ ...d, kuendigungsfrist: val }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Frist wählen" />
                </SelectTrigger>
                <SelectContent>
                  {kuendigungsfristOptions.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notizen */}
            <div className="space-y-1.5">
              <Label htmlFor="notizen">Notizen</Label>
              <Textarea
                id="notizen"
                placeholder="Interne Hinweise zum Vertrag..."
                value={details.notizen}
                onChange={e => setDetails(d => ({ ...d, notizen: e.target.value }))}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={() => handleStepChange(2)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button
              onClick={handleDetailsNext}
              disabled={!details.vertragsbezeichnung.trim()}
              className="gap-2"
            >
              Weiter zur Bestätigung
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Bestätigung ── */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Zusammenfassung</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Prüfe alle Angaben und lege den Vertrag an.</p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {/* Partner */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconBuilding size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Partner</p>
                <p className="text-sm font-semibold mt-0.5">{selectedPartner?.fields.firmenname ?? '—'}</p>
                {selectedPartner?.fields.branche?.label && (
                  <p className="text-xs text-muted-foreground">{selectedPartner.fields.branche.label}</p>
                )}
              </div>
            </div>

            {/* Ansprechpartner */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconUser size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ansprechpartner</p>
                {selectedAnsprechpartner ? (
                  <>
                    <p className="text-sm font-semibold mt-0.5">
                      {[selectedAnsprechpartner.fields.vorname, selectedAnsprechpartner.fields.nachname].filter(Boolean).join(' ')}
                    </p>
                    {selectedAnsprechpartner.fields.position && (
                      <p className="text-xs text-muted-foreground">{selectedAnsprechpartner.fields.position}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">Kein Ansprechpartner</p>
                )}
              </div>
            </div>

            {/* Vertragsdetails */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconFileDescription size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vertragsdetails</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Bezeichnung: </span>
                    <span className="font-medium">{details.vertragsbezeichnung || '—'}</span>
                  </div>
                  {details.vertragsnummer && (
                    <div>
                      <span className="text-muted-foreground text-xs">Nummer: </span>
                      <span className="font-medium">{details.vertragsnummer}</span>
                    </div>
                  )}
                  {details.kategorie && (
                    <div>
                      <span className="text-muted-foreground text-xs">Kategorie: </span>
                      <span className="font-medium">
                        {kategorieOptions.find(o => o.key === details.kategorie)?.label ?? details.kategorie}
                      </span>
                    </div>
                  )}
                  {details.status && (
                    <div>
                      <span className="text-muted-foreground text-xs">Status: </span>
                      <span className="font-medium">
                        {statusOptions.find(o => o.key === details.status)?.label ?? details.status}
                      </span>
                    </div>
                  )}
                  {details.startdatum && (
                    <div>
                      <span className="text-muted-foreground text-xs">Startdatum: </span>
                      <span className="font-medium">{formatDate(details.startdatum)}</span>
                    </div>
                  )}
                  {details.enddatum && (
                    <div>
                      <span className="text-muted-foreground text-xs">Enddatum: </span>
                      <span className="font-medium">{formatDate(details.enddatum)}</span>
                    </div>
                  )}
                  {details.jahresvolumen && (
                    <div>
                      <span className="text-muted-foreground text-xs">Jahresvolumen: </span>
                      <span className="font-semibold text-primary">{formatCurrency(details.jahresvolumen)}</span>
                    </div>
                  )}
                  {details.kuendigungsfrist && (
                    <div>
                      <span className="text-muted-foreground text-xs">Kündigungsfrist: </span>
                      <span className="font-medium">
                        {kuendigungsfristOptions.find(o => o.key === details.kuendigungsfrist)?.label ?? details.kuendigungsfrist}
                      </span>
                    </div>
                  )}
                  {details.notizen && (
                    <div className="col-span-full">
                      <span className="text-muted-foreground text-xs">Notizen: </span>
                      <span className="font-medium">{details.notizen}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={() => handleStepChange(3)} className="gap-1.5" disabled={submitting}>
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedPartnerId}
              className="gap-2"
            >
              {submitting ? (
                'Wird angelegt…'
              ) : (
                <>
                  <IconCheck size={15} stroke={2.5} />
                  Vertrag anlegen
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
