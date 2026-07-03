import type { Vertraege, Partner, Ansprechpartner } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface VertraegeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Vertraege | null;
  onEdit: (record: Vertraege) => void;
  partnerList: Partner[];
  ansprechpartnerList: Ansprechpartner[];
}

export function VertraegeViewDialog({ open, onClose, record, onEdit, partnerList, ansprechpartnerList }: VertraegeViewDialogProps) {
  function getPartnerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return partnerList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  function getAnsprechpartnerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return ansprechpartnerList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verträge anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertragsbezeichnung</Label>
            <p className="text-sm">{record.fields.vertragsbezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertragsnummer</Label>
            <p className="text-sm">{record.fields.vertragsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Partner</Label>
            <p className="text-sm">{getPartnerDisplayName(record.fields.partner)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ansprechpartner</Label>
            <p className="text-sm">{getAnsprechpartnerDisplayName(record.fields.ansprechpartner)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresvolumen (€)</Label>
            <p className="text-sm">{record.fields.jahresvolumen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startdatum</Label>
            <p className="text-sm">{formatDate(record.fields.startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Enddatum</Label>
            <p className="text-sm">{formatDate(record.fields.enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kündigungsfrist</Label>
            <Badge variant="secondary">{record.fields.kuendigungsfrist?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kündigungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.kuendigungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertragsdokument</Label>
            {record.fields.vertragsdokument ? (
              <MediaThumbnail src={record.fields.vertragsdokument} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.VERTRAEGE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}