import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichVertraege } from '@/lib/enrich';
import type { EnrichedVertraege } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconFileText, IconCalendar, IconBuildingStore, IconAlertTriangle, IconClockExclamation, IconPencil } from '@tabler/icons-react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import {
  TableWidget,
  type TableColumn,
  type TableRow,
  type TableTone,
} from '@/components/widgets/TableWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { VertraegeDialog } from '@/components/dialogs/VertraegeDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';

const APPGROUP_ID = '6a46311fe23a1bb86bb813db';
const REPAIR_ENDPOINT = '/claude/build/repair';

type OverlayItem = { type: 'vertrag'; id: string } | { type: 'partner'; id: string };

function toneForStatus(status: string | undefined): TableTone {
  if (status === 'aktiv') return 'success';
  if (status === 'in_verhandlung') return 'primary';
  if (status === 'ruhend') return 'warning';
  if (status === 'gekuendigt' || status === 'abgelaufen') return 'destructive';
  return 'default';
}

export default function DashboardOverview() {
  const {
    vertraege, partner, ansprechpartner,
    partnerMap, ansprechpartnerMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  const enrichedVertraege = enrichVertraege(vertraege, { partnerMap, ansprechpartnerMap });

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedVertraege | null>(null);

  const overlay = useRecordOverlayStack<OverlayItem>();

  // KPI computations — all hooks must be before early returns
  const aktiv = useMemo(() => enrichedVertraege.filter(v => lookupKey(v.fields.status) === 'aktiv'), [enrichedVertraege]);
  const inVerhandlung = useMemo(() => enrichedVertraege.filter(v => lookupKey(v.fields.status) === 'in_verhandlung'), [enrichedVertraege]);

  // Verträge ablaufend in 60 Tagen
  const bald_ablaufend = useMemo(() => enrichedVertraege.filter(v => {
    if (!v.fields.enddatum) return false;
    const end = parseISO(v.fields.enddatum);
    const diffDays = differenceInDays(end, parseISO(today));
    return diffDays >= 0 && diffDays <= 60 && lookupKey(v.fields.status) === 'aktiv';
  }), [enrichedVertraege, today]);

  // Bereits abgelaufen (Enddatum in der Vergangenheit, Status noch aktiv)
  const abgelaufen = useMemo(() => enrichedVertraege.filter(v => {
    if (!v.fields.enddatum) return false;
    return isBefore(parseISO(v.fields.enddatum), parseISO(today)) && lookupKey(v.fields.status) === 'aktiv';
  }), [enrichedVertraege, today]);

  // Gesamtvolumen aktiver Verträge
  const gesamtvolumen = useMemo(() => aktiv.reduce((sum, v) => sum + (v.fields.jahresvolumen ?? 0), 0), [aktiv]);

  // Filtered rows for table
  const filteredVertraege = useMemo(() => {
    if (!statusFilter) return enrichedVertraege;
    return enrichedVertraege.filter(v => lookupKey(v.fields.status) === statusFilter);
  }, [enrichedVertraege, statusFilter]);

  // TableWidget columns
  const columns: TableColumn<EnrichedVertraege>[] = [
    {
      key: 'bezeichnung',
      label: 'Vertragsbezeichnung',
      accessor: r => r.data.fields.vertragsbezeichnung ?? '',
      format: 'text',
      priority: 100,
    },
    {
      key: 'partner',
      label: 'Partner',
      accessor: r => r.data.partnerName || '—',
      format: 'text',
      priority: 90,
    },
    {
      key: 'status',
      label: 'Status',
      accessor: r => r.data.fields.status?.label ?? '—',
      format: 'pill',
      responsive: 'keep' as const,
    },
    {
      key: 'kategorie',
      label: 'Kategorie',
      accessor: r => r.data.fields.kategorie?.label ?? '—',
      format: 'pill',
    },
    {
      key: 'startdatum',
      label: 'Startdatum',
      accessor: r => r.data.fields.startdatum ?? '',
      format: 'date',
    },
    {
      key: 'enddatum',
      label: 'Enddatum',
      accessor: r => r.data.fields.enddatum ?? '',
      format: 'date',
    },
    {
      key: 'jahresvolumen',
      label: 'Jahresvolumen',
      accessor: r => r.data.fields.jahresvolumen ?? 0,
      format: 'currency',
      aggregate: 'sum',
    },
  ];

  const tableRows: TableRow<EnrichedVertraege>[] = filteredVertraege.map(v => ({
    id: `vertrag:${v.record_id}`,
    data: v,
    tone: toneForStatus(lookupKey(v.fields.status)),
  }));

  // Aside: bald ablaufende Verträge als WorkList
  const ablaufendItems = bald_ablaufend.slice(0, 5).map(v => {
    const diffDays = v.fields.enddatum ? differenceInDays(parseISO(v.fields.enddatum), parseISO(today)) : null;
    const daysLabel = diffDays !== null ? (diffDays === 0 ? 'Heute' : `in ${diffDays} Tagen`) : '';
    return {
      id: v.record_id,
      title: v.fields.vertragsbezeichnung ?? '—',
      secondLine: (
        <>
          <span className="text-amber-600 font-medium">{daysLabel}</span>
          {v.partnerName ? <span className="text-muted-foreground"> · {v.partnerName}</span> : null}
        </>
      ),
      action: {
        label: 'Bearbeiten',
        onClick: () => {
          setEditRecord(v);
          setDialogOpen(true);
        },
      },
    };
  });

  // Aside: Partner-Liste als WorkList
  const partnerItems = partner.slice(0, 5).map(p => {
    const vertraegeCount = enrichedVertraege.filter(v => v.partnerName === p.fields.firmenname).length;
    return {
      id: p.record_id,
      title: p.fields.firmenname ?? '—',
      secondLine: (
        <>
          <span className="text-muted-foreground">{p.fields.branche?.label ?? ''}</span>
          {vertraegeCount > 0 && <span className="text-muted-foreground"> · {vertraegeCount} Vertrag{vertraegeCount !== 1 ? 'verträge' : ''}</span>}
        </>
      ),
    };
  });

  // Context line für Greeting
  const contextLine = useMemo(() => {
    if (abgelaufen.length > 0) {
      const names = namen(abgelaufen.map(v => v.partnerName || v.fields.vertragsbezeichnung || '').filter(Boolean));
      return `${abgelaufen.length} Vertrag${abgelaufen.length > 1 ? 'verträge' : ''} abgelaufen — ${names} benötigen Aufmerksamkeit.`;
    }
    if (bald_ablaufend.length > 0) {
      const names = namen(bald_ablaufend.map(v => v.partnerName || v.fields.vertragsbezeichnung || '').filter(Boolean));
      return `${bald_ablaufend.length} Vertrag${bald_ablaufend.length > 1 ? 'verträge' : ''} laufen bald aus — ${names}.`;
    }
    if (aktiv.length > 0) {
      return `${aktiv.length} aktive Vertrag${aktiv.length !== 1 ? 'verträge' : ''} mit ${partner.length} Partner${partner.length !== 1 ? 'n' : ''}.`;
    }
    return 'Noch keine Verträge erfasst. Leg los!';
  }, [abgelaufen, bald_ablaufend, aktiv, partner]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Hero: abgelaufene Verträge (dringend!)
  const heroContent = abgelaufen.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      tone="destructive"
      action={{
        label: 'Status aktualisieren',
        onClick: () => {
          const v = abgelaufen[0];
          setEditRecord(v);
          setDialogOpen(true);
        },
      }}
    >
      <b>{namen(abgelaufen.map(v => v.partnerName || v.fields.vertragsbezeichnung || '').filter(Boolean))}</b>
      {' '}— {abgelaufen.length === 1 ? 'Vertrag abgelaufen' : `${abgelaufen.length} Verträge abgelaufen`}, Status noch „Aktiv".
    </HeroBanner>
  ) : null;

  const overlayRecord = overlay.top ? enrichedVertraege.find(v => v.record_id === (overlay.top as OverlayItem & { type: 'vertrag' }).id) : null;
  const overlayPartnerRecord = overlay.top?.type === 'partner' ? partner.find(p => p.record_id === (overlay.top as OverlayItem & { type: 'partner' }).id) : null;

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
          className="shrink-0"
        >
          <IconPlus size={16} className="mr-1 shrink-0" />
          Neuer Vertrag
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroContent}
        kpis={
          <StatStrip>
            <StatStripItem
              title="Aktiv"
              value={aktiv.length}
              icon={<IconFileText size={16} />}
              tone={aktiv.length > 0 ? 'success' : 'default'}
              onClick={() => setStatusFilter(f => f === 'aktiv' ? null : 'aktiv')}
              active={statusFilter === 'aktiv'}
            />
            <StatStripItem
              title="In Verhandlung"
              value={inVerhandlung.length}
              icon={<IconCalendar size={16} />}
              tone={inVerhandlung.length > 0 ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f => f === 'in_verhandlung' ? null : 'in_verhandlung')}
              active={statusFilter === 'in_verhandlung'}
            />
            <StatStripItem
              title="Läuft bald ab"
              value={bald_ablaufend.length}
              icon={<IconClockExclamation size={16} />}
              tone={bald_ablaufend.length > 0 ? 'warning' : 'default'}
              onClick={() => {
                // filter to bald ablaufend by toggling — we need a custom filter
                setStatusFilter(null);
              }}
              active={false}
            />
            <StatStripItem
              title="Partner"
              value={partner.length}
              icon={<IconBuildingStore size={16} />}
              tone="default"
            />
          </StatStrip>
        }
        aside={
          <>
            <WorkList
              title="Bald ablaufend (60 Tage)"
              icon={<IconClockExclamation size={14} />}
              items={ablaufendItems}
              onItemClick={id => overlay.replace({ type: 'vertrag', id })}
              empty={{
                text: 'Kein Vertrag läuft in den nächsten 60 Tagen ab.',
                action: { label: 'Neuer Vertrag', onClick: () => { setEditRecord(null); setDialogOpen(true); } },
              }}
              max={5}
            />
            <WorkList
              title="Partner"
              icon={<IconBuildingStore size={14} />}
              items={partnerItems}
              onItemClick={id => overlay.replace({ type: 'partner', id })}
              empty={{
                text: 'Noch keine Partner angelegt.',
              }}
              max={5}
            />
          </>
        }
        primary={
          filteredVertraege.length === 0 && enrichedVertraege.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-[27px] bg-card shadow-lg">
              <IconFileText size={48} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Noch keine Verträge</h3>
                <p className="text-sm text-muted-foreground">Erfasse deinen ersten Vertrag, um loszulegen.</p>
              </div>
              <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
                <IconPlus size={16} className="mr-1" />
                Ersten Vertrag erfassen
              </Button>
            </div>
          ) : (
            <TableWidget
              columns={columns}
              rows={tableRows}
              onRowClick={row => overlay.replace({ type: 'vertrag', id: row.id.split(':')[1] ?? '' })}
              toneForRow={row => toneForStatus(lookupKey(row.data.fields.status))}
              locale="de"
              exportable
              density="standard"
              actions={[
                {
                  icon: IconPencil,
                  label: 'Bearbeiten',
                  onClick: row => {
                    setEditRecord(row.data);
                    setDialogOpen(true);
                  },
                },
              ]}
            />
          )
        }
      />

      {/* Vertrag Detail Overlay */}
      {overlayRecord && (
        <RecordOverlay
          open={overlay.open && overlay.top?.type === 'vertrag'}
          onClose={() => overlay.close()}
          onBack={overlay.canGoBack ? () => overlay.pop() : undefined}
          onEdit={() => {
            setEditRecord(overlayRecord);
            setDialogOpen(true);
          }}
          editLabel="Bearbeiten"
        >
          <RecordHeader
            title={overlayRecord.fields.vertragsbezeichnung ?? '—'}
            subtitle={overlayRecord.partnerName || undefined}
            badges={
              overlayRecord.fields.status ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  lookupKey(overlayRecord.fields.status) === 'aktiv' ? 'bg-green-100 text-green-800' :
                  lookupKey(overlayRecord.fields.status) === 'in_verhandlung' ? 'bg-blue-100 text-blue-800' :
                  lookupKey(overlayRecord.fields.status) === 'ruhend' ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {overlayRecord.fields.status.label}
                </span>
              ) : undefined
            }
          />
          <RecordSection title="Vertragsdaten" cols={2}>
            <RecordField label="Vertragsnummer" value={overlayRecord.fields.vertragsnummer} />
            <RecordField label="Kategorie" value={overlayRecord.fields.kategorie} format="pill" />
            <RecordField label="Startdatum" value={overlayRecord.fields.startdatum} format="date" />
            <RecordField label="Enddatum" value={overlayRecord.fields.enddatum} format="date" />
            <RecordField label="Kündigungsfrist" value={overlayRecord.fields.kuendigungsfrist} format="pill" />
            <RecordField label="Kündigungsdatum" value={overlayRecord.fields.kuendigungsdatum} format="date" />
            <RecordField label="Jahresvolumen" value={overlayRecord.fields.jahresvolumen} format="currency" />
          </RecordSection>
          <RecordSection title="Vertragspartner" cols={2}>
            <RecordField label="Partner" value={overlayRecord.partnerName || '—'} />
            <RecordField label="Ansprechpartner" value={overlayRecord.ansprechpartnerName || '—'} />
          </RecordSection>
          {overlayRecord.fields.notizen && (
            <RecordSection title="Notizen">
              <RecordField label="" value={overlayRecord.fields.notizen} format="longtext" />
            </RecordSection>
          )}
          <RecordAttachments appId={APP_IDS.VERTRAEGE} recordId={overlayRecord.record_id} />
        </RecordOverlay>
      )}

      {/* Partner Detail Overlay */}
      {overlayPartnerRecord && (
        <RecordOverlay
          open={overlay.open && overlay.top?.type === 'partner'}
          onClose={() => overlay.close()}
          onBack={overlay.canGoBack ? () => overlay.pop() : undefined}
        >
          <RecordHeader
            title={overlayPartnerRecord.fields.firmenname ?? '—'}
            subtitle={overlayPartnerRecord.fields.branche?.label}
          />
          <RecordSection title="Kontakt" cols={2}>
            <RecordField label="Telefon" value={overlayPartnerRecord.fields.telefon} />
            <RecordField label="E-Mail" value={overlayPartnerRecord.fields.email} format="email" />
            <RecordField label="Webseite" value={overlayPartnerRecord.fields.webseite} format="url" />
          </RecordSection>
          <RecordSection title="Adresse" cols={2}>
            <RecordField label="Straße" value={[overlayPartnerRecord.fields.strasse, overlayPartnerRecord.fields.hausnummer].filter(Boolean).join(' ') || undefined} />
            <RecordField label="Ort" value={[overlayPartnerRecord.fields.postleitzahl, overlayPartnerRecord.fields.ort].filter(Boolean).join(' ') || undefined} />
          </RecordSection>
          {overlayPartnerRecord.fields.notizen && (
            <RecordSection title="Notizen">
              <RecordField label="" value={overlayPartnerRecord.fields.notizen} format="longtext" />
            </RecordSection>
          )}
          <RecordAttachments appId={APP_IDS.PARTNER} recordId={overlayPartnerRecord.record_id} />
        </RecordOverlay>
      )}

      {/* Create/Edit Dialog */}
      <VertraegeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async fields => {
          if (editRecord) {
            await LivingAppsService.updateVertraegeEntry(editRecord.record_id, fields);
            undoToast(`Vertrag „${fields.vertragsbezeichnung ?? editRecord.fields.vertragsbezeichnung}" aktualisiert.`, async () => {
              await LivingAppsService.updateVertraegeEntry(editRecord.record_id, editRecord.fields as any);
              fetchAll();
            });
          } else {
            await LivingAppsService.createVertraegeEntry(fields);
            undoToast(`Vertrag „${fields.vertragsbezeichnung ?? ''}" erstellt.`);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        partnerList={partner}
        ansprechpartnerList={ansprechpartner}
        enablePhotoScan={AI_PHOTO_SCAN['Vertraege']}
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
