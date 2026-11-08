import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Dumbbell, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Chip,
  Field,
  SegmentedControl,
  SelectInput,
  TextInput,
} from "../../../components/ui/inputs";
import {
  DIFFICULTIES,
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type Difficulty,
  type EquipmentType,
  type Exercise,
  type MuscleGroup,
} from "../../../models";
import { db, exerciseRepository } from "../../../services/storage";
import {
  parseWgerImportJson,
  type WgerExercisePreview,
} from "../../../services/import/wgerExerciseAdapter";
import {
  difficultyLabels,
  equipmentLabels,
  muscleGroupLabels,
} from "../../../utils/labels";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface ExerciseFormValues {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  difficulty: Difficulty;
}

interface ExerciseFormProps {
  submitLabel: string;
  onSubmit: (values: ExerciseFormValues) => void;
}

/** Compact form used inside the bottom sheet to create a custom exercise. */
function ExerciseForm({ submitLabel, onSubmit }: ExerciseFormProps) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<EquipmentType>("bodyweight");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError("Bitte gib einen Namen für die Übung ein.");
      return;
    }
    onSubmit({ name: trimmed, muscleGroup, equipment, difficulty });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Name" error={nameError}>
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder="z. B. Bulgarian Split Squat"
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(undefined);
            }}
          />
        )}
      </Field>
      <Field label="Muskelgruppe">
        {(id) => (
          <SelectInput
            id={id}
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {muscleGroupLabels[group]}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label="Equipment">
        {(id) => (
          <SelectInput
            id={id}
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as EquipmentType)}
          >
            {EQUIPMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {equipmentLabels[type]}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <div className="field">
        <span className="field__label">Schwierigkeit</span>
        <SegmentedControl
          options={DIFFICULTIES.map((d) => ({ value: d, label: difficultyLabels[d] }))}
          value={difficulty}
          onChange={setDifficulty}
          ariaLabel="Schwierigkeit"
        />
      </div>
      <Button onClick={handleSubmit}>{submitLabel}</Button>
    </div>
  );
}

export default function ExerciseListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<WgerExercisePreview[]>([]);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  const filtered = useMemo(() => {
    if (!exercises) return undefined;
    const query = search.trim().toLowerCase();
    return exercises
      .filter((exercise: Exercise) => {
        if (query !== "" && !exercise.name.toLowerCase().includes(query)) return false;
        if (muscleFilter.length > 0 && !muscleFilter.includes(exercise.muscleGroup)) {
          return false;
        }
        if (equipmentFilter.length > 0 && !equipmentFilter.includes(exercise.equipment)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [exercises, search, muscleFilter, equipmentFilter]);

  const hasActiveFilter =
    search.trim() !== "" || muscleFilter.length > 0 || equipmentFilter.length > 0;

  const resetFilters = () => {
    setSearch("");
    setMuscleFilter([]);
    setEquipmentFilter([]);
  };

  const handleCreate = async (values: ExerciseFormValues) => {
    try {
      await exerciseRepository.create({
        name: values.name,
        muscleGroup: values.muscleGroup,
        secondaryMuscles: [],
        equipment: values.equipment,
        difficulty: values.difficulty,
        instructions: [],
        commonMistakes: [],
        tips: [],
        isCustom: true,
      });
      setSheetOpen(false);
      showToast("Übung gespeichert.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  async function readWgerFile(file: File | undefined) {
    if (!file) return;
    setImportError("");
    setImportPreview([]);
    if (file.size > 5_000_000) {
      setImportError("Die JSON-Datei darf höchstens 5 MB groß sein.");
      return;
    }
    try {
      const preview = parseWgerImportJson(await file.text());
      setImportPreview(preview);
    } catch {
      setImportError("Ungültige wger-Datei. Prüfe Format, Lizenz und Urheber.");
    }
  }

  async function saveWgerImport() {
    if (importBusy || importPreview.length === 0) return;
    setImportBusy(true);
    try {
      const { created, skipped } = await exerciseRepository.importAttributedExercises(importPreview);
      showToast(`${created} Übungen importiert${skipped > 0 ? `, ${skipped} bereits vorhanden` : ""}.`);
      setImportOpen(false);
      setImportPreview([]);
      setImportError("");
    } catch {
      setImportError("Import fehlgeschlagen. Vorhandene Übungen wurden nicht ersetzt.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Übungen"
        back
        subtitle={
          exercises ? `${exercises.length} Übungen in der Bibliothek` : undefined
        }
        trailing={
          <IconButton label="Eigene Übung anlegen" onClick={() => setSheetOpen(true)}>
            <Plus size={22} />
          </IconButton>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" small autoWidth onClick={() => setImportOpen(true)}>
            <Upload size={16} aria-hidden="true" /> wger-JSON importieren
          </Button>
        </div>
        <TextInput
          value={search}
          placeholder="Übung suchen …"
          aria-label="Übung suchen"
          enterKeyHint="search"
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="chip-row" role="group" aria-label="Nach Muskelgruppe filtern">
          {MUSCLE_GROUPS.map((group) => (
            <Chip
              key={group}
              label={muscleGroupLabels[group]}
              selected={muscleFilter.includes(group)}
              onClick={() => setMuscleFilter((current) => toggleValue(current, group))}
            />
          ))}
        </div>

        <div className="chip-row" role="group" aria-label="Nach Equipment filtern">
          {EQUIPMENT_TYPES.map((type) => (
            <Chip
              key={type}
              label={equipmentLabels[type]}
              selected={equipmentFilter.includes(type)}
              onClick={() => setEquipmentFilter((current) => toggleValue(current, type))}
            />
          ))}
        </div>

        {filtered === undefined ? (
          <LoadingState rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Keine Übungen gefunden."
            text={
              hasActiveFilter
                ? "Für diese Suche oder Filter gibt es keine Treffer."
                : "Lege deine erste eigene Übung an."
            }
            action={
              hasActiveFilter
                ? { label: "Filter zurücksetzen", onClick: resetFilters }
                : { label: "Übung anlegen", onClick: () => setSheetOpen(true) }
            }
          />
        ) : (
          <Card>
            {filtered.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="list-row"
                onClick={() => navigate(`/training/exercises/${exercise.id}`)}
              >
                <span className="list-row__body" style={{ display: "block" }}>
                  <span className="list-row__title" style={{ display: "block" }}>
                    {exercise.name}
                  </span>
                  <span className="list-row__subtitle" style={{ display: "block" }}>
                    {muscleGroupLabels[exercise.muscleGroup]} ·{" "}
                    {equipmentLabels[exercise.equipment]}
                    {exercise.sourceRef ? ` · Import: ${exercise.sourceRef}${exercise.taxonomyNeedsReview ? " · Muskelzuordnung prüfen" : ""}`
                      : exercise.isCustom ? " · Eigene Übung" : ""}
                  </span>
                </span>
                <span className="list-row__trailing">
                  <ChevronRight size={18} />
                </span>
              </button>
            ))}
          </Card>
        )}
      </div>

      <BottomSheet
        open={importOpen}
        title="Übungen aus wger-JSON"
        onClose={() => { if (!importBusy) setImportOpen(false); }}
      >
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 14 }}>
          Importiere eine lokal vorbereitete JSON-Liste mit Quellen-ID, Urheber und Lizenz.
          Keine Bilder oder fremden Trainingsdaten werden automatisch geladen.
        </p>
        <Field label="JSON-Datei auswählen" error={importError || undefined}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void readWgerFile(event.currentTarget.files?.[0])}
            />
          )}
        </Field>
        {importPreview.length > 0 ? (
          <>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>
              Vorschau: {importPreview.length} Übungen
            </p>
            <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 12 }}>
              {importPreview.slice(0, 20).map((entry) => (
                <p key={entry.sourceKey} style={{ fontSize: 13, padding: "3px 0" }}>
                  {entry.name} · {entry.attribution.author} · {entry.attribution.license}
                </p>
              ))}
              {importPreview.length > 20 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  … und {importPreview.length - 20} weitere
                </p>
              ) : null}
            </div>
            {importPreview.some((entry) => entry.needsMuscleReview) ? (
              <p style={{ fontSize: 13, color: "var(--warning)", marginBottom: 12 }}>
                {importPreview.filter((entry) => entry.needsMuscleReview).length} Übungen haben
                keine eindeutige Muskelangabe in der Quelle. Ihre Zuordnung muss
                nach dem Import geprüft werden.
              </p>
            ) : null}
            <Button disabled={importBusy} onClick={() => void saveWgerImport()}>
              {importBusy ? "Import wird gespeichert …" : "Übungen importieren"}
            </Button>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={sheetOpen}
        title="Eigene Übung"
        onClose={() => setSheetOpen(false)}
      >
        <ExerciseForm submitLabel="Übung speichern" onSubmit={handleCreate} />
      </BottomSheet>
    </>
  );
}
