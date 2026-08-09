import { useLiveQuery } from "dexie-react-hooks";
import { Camera, GitCompareArrows } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet, ConfirmDialog } from "../../components/feedback/Modal";
import { EmptyState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/inputs";
import { PHOTO_POSES, type PhotoPose, type ProgressPhoto } from "../../models";
import { preparePhotoForStorage } from "../../services/media/imageProcessing";
import { mediaRepository, progressPhotoRepository } from "../../services/storage";
import { formatDateShortGerman } from "../../utils/dates";

const POSE_LABELS: Record<PhotoPose, string> = {
  front: "Front",
  side: "Seite",
  back: "Rücken",
};

/** Object-URL for a stored photo blob, revoked automatically on unmount. */
function usePhotoUrl(assetId: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    void mediaRepository.get(assetId).then((asset) => {
      if (cancelled || !asset) return;
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);
  return url;
}

function PhotoThumb({ photo, onClick }: { photo: ProgressPhoto; onClick: () => void }) {
  const url = usePhotoUrl(photo.assetId);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Foto ${POSE_LABELS[photo.pose]} vom ${formatDateShortGerman(photo.date)}`}
      style={{
        position: "relative",
        aspectRatio: "3 / 4",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface-3)",
        padding: 0,
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div className="skeleton" style={{ width: "100%", height: "100%" }} />
      )}
      <span
        style={{
          position: "absolute",
          left: 6,
          bottom: 6,
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(15, 16, 18, 0.75)",
          color: "var(--text)",
        }}
      >
        {formatDateShortGerman(photo.date)}
      </span>
    </button>
  );
}

/** Side-by-side before/after of the oldest vs. newest photo of one pose. */
function CompareView({ oldest, newest }: { oldest: ProgressPhoto; newest: ProgressPhoto }) {
  const oldUrl = usePhotoUrl(oldest.assetId);
  const newUrl = usePhotoUrl(newest.assetId);
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {[
        { url: oldUrl, photo: oldest, label: "Vorher" },
        { url: newUrl, photo: newest, label: "Nachher" },
      ].map(({ url, photo, label }) => (
        <figure key={photo.id} style={{ flex: 1, margin: 0, minWidth: 0 }}>
          <div
            style={{
              aspectRatio: "3 / 4",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--surface-3)",
            }}
          >
            {url ? (
              <img
                src={url}
                alt={`${label}: ${formatDateShortGerman(photo.date)}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div className="skeleton" style={{ width: "100%", height: "100%" }} />
            )}
          </div>
          <figcaption
            style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}
          >
            {label} · {formatDateShortGerman(photo.date)}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function PhotosPage() {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [saving, setSaving] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgressPhoto | null>(null);

  const photos = useLiveQuery(() => progressPhotoRepository.listNewestFirst(pose), [pose]);

  async function handleFile(file: File | undefined) {
    if (!file || saving) return;
    setSaving(true);
    try {
      const prepared = await preparePhotoForStorage(file);
      await progressPhotoRepository.createFromBlob(prepared, pose);
      showToast("Foto gespeichert — nur lokal auf diesem Gerät.");
    } catch {
      showToast("Foto konnte nicht gespeichert werden. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await progressPhotoRepository.delete(deleteTarget.id);
      showToast("Foto gelöscht.");
    } catch {
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setDeleteTarget(null);
    }
  }

  const canCompare = (photos ?? []).length >= 2;
  const newest = photos?.[0];
  const oldest = photos?.[photos.length - 1];

  return (
    <>
      <PageHeader
        title="Fortschrittsfotos"
        subtitle="Nur lokal · nicht im JSON-Backup"
        back
        backFallback="/body"
      />

      <div className="chip-row" role="group" aria-label="Pose wählen">
        {PHOTO_POSES.map((p) => (
          <Chip
            key={p}
            label={POSE_LABELS[p]}
            selected={p === pose}
            onClick={() => setPose(p)}
          />
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button
          autoWidth
          style={{ flex: 1 }}
          disabled={saving}
          onClick={() => fileRef.current?.click()}
        >
          <Camera size={18} aria-hidden="true" />
          {saving ? "Wird gespeichert…" : "Foto aufnehmen"}
        </Button>
        {canCompare ? (
          <Button variant="secondary" autoWidth onClick={() => setCompareOpen(true)}>
            <GitCompareArrows size={18} aria-hidden="true" /> Vergleich
          </Button>
        ) : null}
      </div>

      <SectionHeader title={`${POSE_LABELS[pose]} (${photos?.length ?? 0})`} />
      {photos === undefined ? null : photos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Camera}
            title="Noch keine Fotos in dieser Pose."
            text="Gleiche Pose, gleiches Licht, gleicher Abstand — so werden Vergleiche aussagekräftig."
          />
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {photos.map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} onClick={() => setDeleteTarget(photo)} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 14 }}>
        Fortschrittsfotos bleiben ausschließlich auf diesem Gerät (IndexedDB) und
        sind bewusst nicht Teil des JSON-Backups. Ein medienfähiges Backup-Format
        ist geplant.
      </p>

      <BottomSheet
        open={compareOpen}
        title={`Vergleich · ${POSE_LABELS[pose]}`}
        onClose={() => setCompareOpen(false)}
      >
        {oldest && newest && oldest.id !== newest.id ? (
          <CompareView oldest={oldest} newest={newest} />
        ) : (
          <p style={{ color: "var(--text-muted)" }}>
            Für einen Vergleich braucht es mindestens zwei Fotos derselben Pose.
          </p>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Foto löschen?"
        text={
          deleteTarget
            ? `Das Foto (${POSE_LABELS[deleteTarget.pose]}, ${formatDateShortGerman(deleteTarget.date)}) wird dauerhaft von diesem Gerät entfernt.`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
