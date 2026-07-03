import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Vertraege, Partner, Ansprechpartner } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { VertraegeDialog } from '@/components/dialogs/VertraegeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Vertraege';
import { evalComputed } from '@/config/form-enhancements/types';

export default function VertraegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Vertraege | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [partnerList, setPartnerList] = useState<Partner[]>([]);
  const [ansprechpartnerList, setAnsprechpartnerList] = useState<Ansprechpartner[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, partnerData, ansprechpartnerData] = await Promise.all([
        LivingAppsService.getVertraege(),
        LivingAppsService.getPartner(),
        LivingAppsService.getAnsprechpartner(),
      ]);
      setPartnerList(partnerData);
      setAnsprechpartnerList(ansprechpartnerData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Vertraege['fields']) {
    if (!record) return;
    await LivingAppsService.updateVertraegeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteVertraegeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/vertraege');
  }

  function getPartnerDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return partnerList.find(r => r.record_id === refId)?.fields.firmenname ?? '—';
  }

  function getAnsprechpartnerDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return ansprechpartnerList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/vertraege')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/vertraege')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.vertragsbezeichnung ?? 'Verträge'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          partner: partnerList,
          ansprechpartner: ansprechpartnerList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Vertragsbezeichnung" value={record.fields.vertragsbezeichnung} format="text" />
        <RecordField label="Vertragsnummer" value={record.fields.vertragsnummer} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Partner" value={getPartnerDisplayName(record.fields.partner)} format="text" />
        <RecordField label="Ansprechpartner" value={getAnsprechpartnerDisplayName(record.fields.ansprechpartner)} format="text" />
        <RecordField label="Jahresvolumen (€)" value={record.fields.jahresvolumen} format="text" />
        <RecordField label="Startdatum" value={record.fields.startdatum} format="date" />
        <RecordField label="Enddatum" value={record.fields.enddatum} format="date" />
        <RecordField label="Kündigungsfrist" value={record.fields.kuendigungsfrist} format="pill" />
        <RecordField label="Kündigungsdatum" value={record.fields.kuendigungsdatum} format="date" />
        <RecordField label="Notizen" value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.VERTRAEGE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <VertraegeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        partnerList={partnerList}
        ansprechpartnerList={ansprechpartnerList}
        enablePhotoScan={AI_PHOTO_SCAN['Vertraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Vertraege']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Verträge löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
