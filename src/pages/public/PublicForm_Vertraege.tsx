import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a46310befb6490de8bc48c2';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormVertraege() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Verträge — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="vertragsbezeichnung">Vertragsbezeichnung *</Label>
            <Input
              id="vertragsbezeichnung"
              placeholder=""
              value={fields.vertragsbezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, vertragsbezeichnung: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vertragsnummer">Vertragsnummer</Label>
            <Input
              id="vertragsnummer"
              placeholder=""
              value={fields.vertragsnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, vertragsnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie</Label>
            <Select
              value={lookupKey(fields.kategorie) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="kategorie" className="max-sm:h-11"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="dienstleistung">Dienstleistung</SelectItem>
                <SelectItem value="liefervertrag">Liefervertrag</SelectItem>
                <SelectItem value="lizenzvertrag">Lizenzvertrag</SelectItem>
                <SelectItem value="mietvertrag">Mietvertrag</SelectItem>
                <SelectItem value="wartungsvertrag">Wartungsvertrag</SelectItem>
                <SelectItem value="rahmenvertrag">Rahmenvertrag</SelectItem>
                <SelectItem value="kooperationsvertrag">Kooperationsvertrag</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={lookupKey(fields.status) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="status" className="max-sm:h-11"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="in_verhandlung">In Verhandlung</SelectItem>
                <SelectItem value="ruhend">Ruhend</SelectItem>
                <SelectItem value="gekuendigt">Gekündigt</SelectItem>
                <SelectItem value="abgelaufen">Abgelaufen</SelectItem>
                <SelectItem value="entwurf">Entwurf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahresvolumen">Jahresvolumen (€)</Label>
            <Input
              id="jahresvolumen"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.jahresvolumen ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, jahresvolumen: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startdatum">Startdatum *</Label>
            <DatePicker
              id="startdatum"
              placeholder=""
              mode="date"
              value={fields.startdatum ?? null}
              onChange={v => setFields(f => ({ ...f, startdatum: v ?? undefined }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enddatum">Enddatum</Label>
            <DatePicker
              id="enddatum"
              placeholder=""
              mode="date"
              value={fields.enddatum ?? null}
              onChange={v => setFields(f => ({ ...f, enddatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kuendigungsfrist">Kündigungsfrist</Label>
            <Select
              value={lookupKey(fields.kuendigungsfrist) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, kuendigungsfrist: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="kuendigungsfrist" className="max-sm:h-11"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="zwei_wochen">2 Wochen</SelectItem>
                <SelectItem value="ein_monat">1 Monat</SelectItem>
                <SelectItem value="zwei_monate">2 Monate</SelectItem>
                <SelectItem value="drei_monate">3 Monate</SelectItem>
                <SelectItem value="sechs_monate">6 Monate</SelectItem>
                <SelectItem value="zwoelf_monate">12 Monate</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kuendigungsdatum">Kündigungsdatum</Label>
            <DatePicker
              id="kuendigungsdatum"
              placeholder=""
              mode="date"
              value={fields.kuendigungsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, kuendigungsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              placeholder=""
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
