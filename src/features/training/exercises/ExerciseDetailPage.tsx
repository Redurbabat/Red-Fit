import { useLiveQuery } from "dexie-react-hooks";
import { Box, Lightbulb, Pause, Pencil, Play, Trash2, X } from "lucide-react";
import { lazy, Suspense, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseAnimation } from "../../../components/exercise/ExerciseAnimation";
import { MuscleMap } from "../../../components/exercise/MuscleMap";
import { ExerciseWeightChartSection } from "../../../components/progress/ExerciseWeightChart";

// three loads only when the user switches the card to 3D (§104).
const ExerciseCoach3D = lazy(() => import("../../../components/exercise3d"));
import { BottomSheet, ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card, StatCard } from "../../../components/ui/Card";
import {
  Field,
  SegmentedControl,
  SelectInput,
  TextInput,
} from "../../../components/ui/inputs";
import { useSettings } from "../../../hooks/useSettings";
import {
  DIFFICULTIES,
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type Difficulty,
  type EquipmentType,
  type MuscleGroup,
  type SetLog,
} from "../../../models";
import {
  findExerciseRecords,
  findLastPerformance,
} from "../../../services/calculations/workout";
import { db, exerciseRepository, workoutLogRepository } from "../../../services/storage";
import { formatDateShortGerman } from "../../../utils/dates";
import {
  difficultyLabels,
  equipmentLabels,
  muscleGroupLabels,
} from "../../../utils/labels";
import { formatKg } from "../../../utils/numbers";

interface ExerciseFormValues {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  difficulty: Difficulty;
}

interface ExerciseFormProps {
  initial: ExerciseFormValues;
  submitLabel: string;
  onSubmit: (values: ExerciseFormValues) => void;
}

/** Prefilled form used inside the bottom sheet to edit a custom exercise. */
function ExerciseForm({ initial, submitLabel, onSubmit }: ExerciseFormProps) {
  const [name, setName] = useState(initial.name);
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(initial.muscleGroup);
  const [equipment, setEquipment] = useState<EquipmentType>(initial.equipment);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
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

/** "80 kg × 8" — bodyweight sets (0 kg) fall back to plain reps. */
function formatSetPerformance(set: Pick<SetLog, "weightKg" | "reps">): string {
  return set.weightKg > 0 ? `${formatKg(set.weightKg)} × ${set.reps}` : `${set.reps} Wdh.`;
}

const stepBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "var(--surface-3)",
  color: "var(--text-muted)",
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0,
};

export default function ExerciseDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // undefined = loading, null = not found — keeps the two states distinguishable.
  const exercise = useLiveQuery(
    async () => (exerciseId ? ((await db.exercises.get(exerciseId)) ?? null) : null),
    [exerciseId],
  );

  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(), []);

  const record = useMemo(() => {
    if (!completedLogs || !exerciseId) return undefined;
    return findExerciseRecords(completedLogs).get(exerciseId);
  }, [completedLogs, exerciseId]);

  /** All completed sets of the most recent session containing this exercise. */
  const lastPerformance = useMemo(() => {
    if (!completedLogs || !exerciseId) return undefined;
    return findLastPerformance(completedLogs, exerciseId);
  }, [completedLogs, exerciseId]);

  const handleEdit = async (values: ExerciseFormValues) => {
    if (!exercise) return;
    try {
      await exerciseRepository.update(exercise.id, {
        name: values.name,
        muscleGroup: values.muscleGroup,
        equipment: values.equipment,
        difficulty: values.difficulty,
      });
      setEditOpen(false);
      showToast("Änderungen gespeichert.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  const handleDelete = async () => {
    if (!exercise) return;
    try {
      await exerciseRepository.delete(exercise.id);
      setConfirmDelete(false);
      showToast("Übung gelöscht.");
      navigate("/training/exercises", { replace: true });
    } catch {
      setConfirmDelete(false);
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  if (exercise === undefined) {
    return (
      <>
        <PageHeader title="Übung" back />
        <LoadingState rows={4} />
      </>
    );
  }

  if (exercise === null) {
    return (
      <>
        <PageHeader title="Übung" back />
        <EmptyState
          title="Übung nicht gefunden."
          text="Sie wurde möglicherweise gelöscht."
          action={{
            label: "Zur Übungsbibliothek",
            onClick: () => navigate("/training/exercises", { replace: true }),
          }}
        />
      </>
    );
  }

  const showPlaceholderCard = !exercise.animationType && settings.show3dPlaceholders;

  return (
    <>
      <PageHeader
        title={exercise.name}
        back
        subtitle={exercise.isCustom ? "Eigene Übung" : undefined}
        trailing={
          exercise.isCustom ? (
            <div style={{ display: "flex", gap: 4 }}>
              <IconButton label="Übung bearbeiten" onClick={() => setEditOpen(true)}>
                <Pencil size={20} />
              </IconButton>
              <IconButton label="Übung löschen" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={20} />
              </IconButton>
            </div>
          ) : undefined
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chip-row" style={{ flexWrap: "wrap" }} aria-label="Eigenschaften">
          <span className="chip">{muscleGroupLabels[exercise.muscleGroup]}</span>
          <span className="chip">{equipmentLabels[exercise.equipment]}</span>
          <span className="chip">{difficultyLabels[exercise.difficulty]}</span>
          {exercise.secondaryMuscles.map((muscle) => (
            <span key={muscle} className="chip">
              {muscleGroupLabels[muscle]}
            </span>
          ))}
        </div>

        {exercise.animationType ? (
          <Card
            style={{
              position: "relative",
              height: viewMode === "3d" ? 320 : 220,
              padding: viewMode === "3d" ? 0 : 18,
              overflow: "hidden",
            }}
          >
            {viewMode === "3d" ? (
              <Suspense
                fallback={
                  <div className="skeleton" style={{ width: "100%", height: "100%" }} />
                }
              >
                <ExerciseCoach3D
                  type={exercise.animationType}
                  // Blender exports drop into public/models/<id>.glb — found
                  // automatically; missing file falls back to the procedural coach.
                  modelUrl={exercise.animation3dUrl ?? `/models/${exercise.id}.glb`}
                />
              </Suspense>
            ) : (
              <>
                <ExerciseAnimation type={exercise.animationType} isPlaying={isPlaying} />
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <IconButton
                    label={isPlaying ? "Animation pausieren" : "Animation abspielen"}
                    onClick={() => setIsPlaying((playing) => !playing)}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </IconButton>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === "3d" ? "2d" : "3d"))}
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 12,
                background: "rgba(34, 35, 41, 0.85)",
                border: "1px solid var(--border)",
                color: viewMode === "3d" ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {viewMode === "3d" ? "Figur" : "3D"}
            </button>
          </Card>
        ) : showPlaceholderCard ? (
          <Card
            style={{
              height: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <Box size={32} color="var(--text-soft)" strokeWidth={1.5} />
            <strong>3D-Animation</strong>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Hier erscheint später die Bewegungsanimation dieser Übung.
            </p>
          </Card>
        ) : null}

        <section>
          <SectionHeader title="Muskelanatomie" />
          <Card>
            <MuscleMap
              primary={exercise.muscleGroup}
              secondary={exercise.secondaryMuscles}
            />
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                marginTop: 10,
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: "var(--accent)",
                    display: "inline-block",
                  }}
                />
                Hauptmuskeln
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: "var(--accent-2)",
                    display: "inline-block",
                  }}
                />
                Sekundäre Muskeln
              </span>
            </div>
          </Card>
        </section>

        {exercise.instructions.length > 0 ? (
          <section>
            <SectionHeader title="Anleitung" />
            <Card>
              <ol
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  margin: 0,
                  padding: 0,
                }}
              >
                {exercise.instructions.map((step, index) => (
                  <li key={index} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={stepBadgeStyle} aria-hidden="true">
                      {index + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        ) : null}

        {exercise.commonMistakes.length > 0 ? (
          <section>
            <SectionHeader title="Häufige Fehler" />
            <Card>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  margin: 0,
                  padding: 0,
                }}
              >
                {exercise.commonMistakes.map((mistake, index) => (
                  <li key={index} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <X
                      size={18}
                      color="var(--danger)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                      aria-hidden="true"
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>{mistake}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {exercise.tips.length > 0 ? (
          <section>
            <SectionHeader title="Tipps" />
            <Card>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  margin: 0,
                  padding: 0,
                }}
              >
                {exercise.tips.map((tip, index) => (
                  <li key={index} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Lightbulb
                      size={18}
                      color="var(--accent-2)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                      aria-hidden="true"
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {lastPerformance ? (
          <section>
            <SectionHeader title="Letzte Leistung" />
            <Card>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 17 }}>
                  {lastPerformance.sets.map(formatSetPerformance).join(" · ")}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  · {formatDateShortGerman(lastPerformance.date)}
                </span>
              </div>
            </Card>
          </section>
        ) : null}

        {record ? (
          <section>
            <SectionHeader title="Bestwerte" />
            <div className="stat-grid">
              <StatCard
                label="Max. Gewicht"
                value={formatKg(record.maxWeightKg)}
                hint={`× ${record.maxRepsAtMaxWeight} Wdh.`}
              />
              <StatCard
                label="Bestes Satzvolumen"
                value={formatKg(record.bestSetVolume)}
                hint="Gewicht × Wdh."
              />
              {record.bestE1rmKg > 0 && record.bestE1rmSet ? (
                <StatCard
                  label="1RM (geschätzt)"
                  value={`≈ ${formatKg(Math.round(record.bestE1rmKg))}`}
                  hint={`aus ${formatSetPerformance(record.bestE1rmSet)}`}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {completedLogs && exerciseId ? (
          <section>
            <ExerciseWeightChartSection completedLogs={completedLogs} exerciseId={exerciseId} />
          </section>
        ) : null}
      </div>

      <BottomSheet
        open={editOpen}
        title="Übung bearbeiten"
        onClose={() => setEditOpen(false)}
      >
        <ExerciseForm
          initial={{
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
          }}
          submitLabel="Änderungen speichern"
          onSubmit={handleEdit}
        />
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Übung löschen?"
        text={`„${exercise.name}“ wird dauerhaft aus deiner Bibliothek entfernt. Bereits protokollierte Workouts bleiben erhalten.`}
        confirmLabel="Löschen"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
