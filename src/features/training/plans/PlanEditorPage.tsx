import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, ChevronUp, Dumbbell, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BottomSheet, ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Chip,
  Field,
  IntegerInput,
  NumberInput,
  SegmentedControl,
  SelectInput,
  TextInput,
} from "../../../components/ui/inputs";
import type {
  Difficulty,
  Exercise,
  FitnessGoal,
  TrainingLocation,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutPlanSession,
} from "../../../models";
import { DIFFICULTIES, FITNESS_GOALS, TRAINING_LOCATIONS } from "../../../models";
import { exerciseRepository, workoutPlanRepository } from "../../../services/storage";
import { nowIso, weekdayNameDe } from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import {
  difficultyLabels,
  equipmentLabels,
  fitnessGoalLabels,
  muscleGroupLabels,
  trainingLocationLabels,
} from "../../../utils/labels";
import { clampMin, formatKg, parseDecimalInput, roundTo } from "../../../utils/numbers";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function newSession(index: number): WorkoutPlanSession {
  return { id: newId(), name: `Tag ${index}`, exercises: [] };
}

function newPlanExercise(exerciseId: string): WorkoutPlanExercise {
  return {
    id: newId(),
    exerciseId,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 90,
  };
}

/* ---------- Small editable number fields (commit on blur) ---------- */

interface IntFieldProps {
  label: string;
  value: number;
  min: number;
  onCommit: (value: number) => void;
}

/** Integer input with local text state — invalid input reverts on blur. */
function IntField({ label, value, min, onCommit }: IntFieldProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const parsed = parseDecimalInput(text);
    if (parsed == null) {
      setText(String(value));
      return;
    }
    const next = clampMin(Math.round(parsed), min);
    onCommit(next);
    setText(String(next));
  }

  return (
    <Field label={label}>
      {(id) => (
        <IntegerInput
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      )}
    </Field>
  );
}

interface WeightFieldProps {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
}

/** Optional target weight — empty means "no target". */
function WeightField({ value, onCommit }: WeightFieldProps) {
  const [text, setText] = useState(value != null ? String(value) : "");

  useEffect(() => {
    setText(value != null ? String(value) : "");
  }, [value]);

  function commit() {
    if (text.trim() === "") {
      onCommit(undefined);
      return;
    }
    const parsed = parseDecimalInput(text);
    if (parsed == null || parsed < 0) {
      setText(value != null ? String(value) : "");
      return;
    }
    const next = roundTo(parsed, 1);
    onCommit(next);
    setText(String(next));
  }

  return (
    <Field label="Zielgewicht (kg, optional)">
      {(id) => (
        <NumberInput
          id={id}
          value={text}
          placeholder="z. B. 60"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      )}
    </Field>
  );
}

/* ---------- Exercise row (expandable editor) ---------- */

interface ExerciseRowProps {
  planExercise: WorkoutPlanExercise;
  exerciseName: string;
  onChange: (next: WorkoutPlanExercise) => void;
  onRemove: () => void;
}

function ExerciseRow({ planExercise, exerciseName, onChange, onRemove }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);

  const summaryParts = [
    `${planExercise.sets}× ${planExercise.repsMin}–${planExercise.repsMax}`,
    `${planExercise.restSeconds}s Pause`,
  ];
  if (planExercise.targetWeightKg != null) {
    summaryParts.push(formatKg(planExercise.targetWeightKg));
  }

  return (
    <div>
      <div className="list-row">
        <button
          type="button"
          className="list-row__body"
          style={{ minHeight: 44, alignSelf: "stretch" }}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="list-row__title">{exerciseName}</div>
          <div className="list-row__subtitle">{summaryParts.join(" · ")}</div>
        </button>
        <div className="list-row__trailing">
          <IconButton
            label={expanded ? `${exerciseName} zuklappen` : `${exerciseName} bearbeiten`}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
          <IconButton label={`${exerciseName} entfernen`} onClick={onRemove}>
            <Trash2 size={20} color="var(--danger)" />
          </IconButton>
        </div>
      </div>
      {expanded ? (
        <div style={{ padding: "4px 0 12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0 12px",
            }}
          >
            <IntField
              label="Sätze"
              value={planExercise.sets}
              min={1}
              onCommit={(v) => onChange({ ...planExercise, sets: v })}
            />
            <IntField
              label="Pause (Sek.)"
              value={planExercise.restSeconds}
              min={0}
              onCommit={(v) => onChange({ ...planExercise, restSeconds: v })}
            />
            <IntField
              label="Wdh. min"
              value={planExercise.repsMin}
              min={0}
              onCommit={(v) => onChange({ ...planExercise, repsMin: v })}
            />
            <IntField
              label="Wdh. max"
              value={planExercise.repsMax}
              min={0}
              onCommit={(v) => onChange({ ...planExercise, repsMax: v })}
            />
          </div>
          {planExercise.repsMin > planExercise.repsMax ? (
            <span className="field__error">
              Minimum darf nicht größer als Maximum sein.
            </span>
          ) : null}
          <WeightField
            value={planExercise.targetWeightKg}
            onCommit={(v) => onChange({ ...planExercise, targetWeightKg: v })}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Session card ---------- */

interface SessionEditorProps {
  session: WorkoutPlanSession;
  index: number;
  exercisesById: Map<string, Exercise>;
  onChange: (next: WorkoutPlanSession) => void;
  onRemove: () => void;
  onAddExercise: () => void;
}

function SessionEditor({
  session,
  index,
  exercisesById,
  onChange,
  onRemove,
  onAddExercise,
}: SessionEditorProps) {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
          Einheit {index + 1}
        </span>
        <IconButton label={`Einheit ${session.name || index + 1} entfernen`} onClick={onRemove}>
          <Trash2 size={20} color="var(--danger)" />
        </IconButton>
      </div>

      <Field
        label="Name der Einheit"
        error={session.name.trim() === "" ? "Bitte gib einen Namen ein." : undefined}
      >
        {(id) => (
          <TextInput
            id={id}
            value={session.name}
            placeholder="z. B. Push, Beine …"
            onChange={(e) => onChange({ ...session, name: e.target.value })}
          />
        )}
      </Field>

      <Field label="Wochentag">
        {(id) => (
          <SelectInput
            id={id}
            value={session.dayIndex != null ? String(session.dayIndex) : ""}
            onChange={(e) =>
              onChange({
                ...session,
                dayIndex: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          >
            <option value="">Kein fester Tag</option>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <option key={day} value={day}>
                {weekdayNameDe(day)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      {session.exercises.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)", padding: "8px 0" }}>
          Noch keine Übungen in dieser Einheit.
        </p>
      ) : (
        <div>
          {session.exercises.map((planExercise) => (
            <ExerciseRow
              key={planExercise.id}
              planExercise={planExercise}
              exerciseName={
                exercisesById.get(planExercise.exerciseId)?.name ?? "Unbekannte Übung"
              }
              onChange={(next) =>
                onChange({
                  ...session,
                  exercises: session.exercises.map((e) => (e.id === next.id ? next : e)),
                })
              }
              onRemove={() =>
                onChange({
                  ...session,
                  exercises: session.exercises.filter((e) => e.id !== planExercise.id),
                })
              }
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" small autoWidth onClick={onAddExercise}>
          <Plus size={16} aria-hidden="true" /> Übung hinzufügen
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Page ---------- */

export default function PlanEditorPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const allExercises = useLiveQuery(() => exerciseRepository.listSorted(), []);
  const exercisesById = useMemo(
    () => new Map((allExercises ?? []).map((e) => [e.id, e])),
    [allExercises],
  );

  const [existing, setExisting] = useState<WorkoutPlan | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [goal, setGoal] = useState<FitnessGoal>("buildMuscle");
  const [location, setLocation] = useState<TrainingLocation>("gym");
  const [level, setLevel] = useState<Difficulty>("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessions, setSessions] = useState<WorkoutPlanSession[]>([newSession(1)]);
  const [makeActive, setMakeActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [removeSessionId, setRemoveSessionId] = useState<string | null>(null);

  const isLoadingExisting = Boolean(planId) && existing === null && !notFound;

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    workoutPlanRepository
      .get(planId)
      .then((plan) => {
        if (cancelled) return;
        if (!plan) {
          setNotFound(true);
          return;
        }
        setExisting(plan);
        setName(plan.name);
        setGoal(plan.goal);
        setLocation(plan.location);
        setLevel(plan.level);
        setDaysPerWeek(plan.daysPerWeek);
        setSessions(plan.sessions);
        setMakeActive(plan.active);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const pickerResults = useMemo(() => {
    const list = allExercises ?? [];
    const query = pickerQuery.trim().toLowerCase();
    if (query === "") return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        muscleGroupLabels[e.muscleGroup].toLowerCase().includes(query),
    );
  }, [allExercises, pickerQuery]);

  function updateSession(next: WorkoutPlanSession) {
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }

  function addSession() {
    setSessions((prev) => [...prev, newSession(prev.length + 1)]);
  }

  function confirmRemoveSession() {
    if (!removeSessionId) return;
    setSessions((prev) => prev.filter((s) => s.id !== removeSessionId));
    setRemoveSessionId(null);
  }

  function openPicker(sessionId: string) {
    setPickerQuery("");
    setPickerSessionId(sessionId);
  }

  function addExerciseToSession(exercise: Exercise) {
    if (!pickerSessionId) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== pickerSessionId
          ? s
          : { ...s, exercises: [...s.exercises, newPlanExercise(exercise.id)] },
      ),
    );
    setPickerSessionId(null);
  }

  /** First validation error (German, user-facing) or null when the plan is valid. */
  function validate(): string | null {
    if (name.trim() === "") {
      setNameError("Bitte gib einen Plannamen ein.");
      return "Bitte gib einen Plannamen ein.";
    }
    setNameError(undefined);
    if (sessions.length === 0) {
      return "Der Plan braucht mindestens eine Einheit.";
    }
    for (const session of sessions) {
      if (session.name.trim() === "") {
        return "Jede Einheit braucht einen Namen.";
      }
      for (const planExercise of session.exercises) {
        const exerciseName =
          exercisesById.get(planExercise.exerciseId)?.name ?? "einer Übung";
        if (planExercise.sets < 1) {
          return `Bei ${exerciseName} muss mindestens 1 Satz eingestellt sein.`;
        }
        if (planExercise.repsMin > planExercise.repsMax) {
          return `Bei ${exerciseName} darf das Wiederholungs-Minimum nicht über dem Maximum liegen.`;
        }
        if (planExercise.restSeconds < 0) {
          return `Bei ${exerciseName} darf die Pause nicht negativ sein.`;
        }
      }
    }
    if (!sessions.some((s) => s.exercises.length > 0)) {
      return "Füge mindestens einer Einheit eine Übung hinzu.";
    }
    return null;
  }

  async function handleSave() {
    if (saving) return;
    const error = validate();
    if (error) {
      showToast(error);
      return;
    }
    setSaving(true);
    try {
      const cleanSessions = sessions.map((s) => ({ ...s, name: s.name.trim() }));
      let savedId: string;
      if (existing) {
        const updated: WorkoutPlan = {
          ...existing,
          name: name.trim(),
          goal,
          daysPerWeek,
          level,
          location,
          sessions: cleanSessions,
          active: makeActive,
          updatedAt: nowIso(),
        };
        await workoutPlanRepository.put(updated);
        savedId = existing.id;
      } else {
        const created = await workoutPlanRepository.create({
          name: name.trim(),
          goal,
          daysPerWeek,
          level,
          location,
          sessions: cleanSessions,
          active: false,
        });
        savedId = created.id;
      }
      if (makeActive) {
        // activate() keeps exactly one plan active.
        await workoutPlanRepository.activate(savedId);
      }
      showToast("Plan gespeichert.");
      navigate(-1);
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Trainingsplan" back />
        <EmptyState
          icon={Dumbbell}
          title="Plan nicht gefunden"
          text="Dieser Trainingsplan existiert nicht mehr."
          action={{ label: "Zu den Plänen", onClick: () => navigate("/training/plans") }}
        />
      </>
    );
  }

  if (isLoadingExisting) {
    return (
      <>
        <PageHeader title="Trainingsplan" back />
        <LoadingState rows={4} />
      </>
    );
  }

  const sessionToRemove = sessions.find((s) => s.id === removeSessionId);

  return (
    <>
      <PageHeader title={existing ? "Plan bearbeiten" : "Neuer Plan"} back />

      <Card>
        <Field label="Name" error={nameError}>
          {(id) => (
            <TextInput
              id={id}
              value={name}
              placeholder="z. B. Push Pull Legs"
              onChange={(e) => {
                setName(e.target.value);
                if (nameError && e.target.value.trim() !== "") setNameError(undefined);
              }}
            />
          )}
        </Field>

        <Field label="Ziel">
          {(id) => (
            <SelectInput
              id={id}
              value={goal}
              onChange={(e) => setGoal(e.target.value as FitnessGoal)}
            >
              {FITNESS_GOALS.map((g) => (
                <option key={g} value={g}>
                  {fitnessGoalLabels[g]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <div className="field">
          <span className="field__label">Trainingsort</span>
          <SegmentedControl
            options={TRAINING_LOCATIONS.map((l) => ({
              value: l,
              label: trainingLocationLabels[l],
            }))}
            value={location}
            onChange={setLocation}
            ariaLabel="Trainingsort"
          />
        </div>

        <div className="field">
          <span className="field__label">Level</span>
          <SegmentedControl
            options={DIFFICULTIES.map((d) => ({ value: d, label: difficultyLabels[d] }))}
            value={level}
            onChange={setLevel}
            ariaLabel="Level"
          />
        </div>

        <div className="field">
          <span className="field__label">Trainingstage pro Woche</span>
          <div className="chip-row" role="group" aria-label="Trainingstage pro Woche">
            {DAY_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={daysPerWeek === n}
                onClick={() => setDaysPerWeek(n)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Nach dem Speichern</span>
          <SegmentedControl
            options={[
              { value: "keep", label: "Nur speichern" },
              { value: "activate", label: "Als aktiven Plan setzen" },
            ]}
            value={makeActive ? "activate" : "keep"}
            onChange={(v) => setMakeActive(v === "activate")}
            ariaLabel="Als aktiven Plan setzen"
          />
        </div>
      </Card>

      <SectionHeader title="Einheiten" action={{ label: "Hinzufügen", onClick: addSession }} />
      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="Noch keine Einheiten"
            text="Ein Plan braucht mindestens eine Einheit mit einer Übung."
            action={{ label: "Einheit hinzufügen", onClick: addSession }}
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map((session, index) => (
            <SessionEditor
              key={session.id}
              session={session}
              index={index}
              exercisesById={exercisesById}
              onChange={updateSession}
              onRemove={() => setRemoveSessionId(session.id)}
              onAddExercise={() => openPicker(session.id)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <Button variant="secondary" onClick={addSession}>
          <Plus size={18} aria-hidden="true" /> Einheit hinzufügen
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Plan speichern"}
        </Button>
      </div>

      <BottomSheet
        open={pickerSessionId !== null}
        title="Übung auswählen"
        onClose={() => setPickerSessionId(null)}
      >
        <Field label="Suche">
          {(id) => (
            <TextInput
              id={id}
              value={pickerQuery}
              placeholder="Übung oder Muskelgruppe …"
              onChange={(e) => setPickerQuery(e.target.value)}
            />
          )}
        </Field>
        <div style={{ maxHeight: "45vh", overflowY: "auto" }}>
          {allExercises === undefined ? (
            <LoadingState rows={3} />
          ) : pickerResults.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Keine Übung gefunden"
              text="Versuche einen anderen Suchbegriff."
            />
          ) : (
            pickerResults.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="list-row"
                onClick={() => addExerciseToSession(exercise)}
              >
                <div className="list-row__body">
                  <div className="list-row__title">{exercise.name}</div>
                  <div className="list-row__subtitle">
                    {muscleGroupLabels[exercise.muscleGroup]} ·{" "}
                    {equipmentLabels[exercise.equipment]}
                  </div>
                </div>
                <div className="list-row__trailing">
                  <Plus size={18} aria-hidden="true" />
                </div>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={removeSessionId !== null}
        title="Einheit entfernen?"
        text={
          sessionToRemove
            ? `„${sessionToRemove.name || "Einheit"}“ und ihre Übungen werden aus dem Plan entfernt.`
            : ""
        }
        confirmLabel="Entfernen"
        danger
        onConfirm={confirmRemoveSession}
        onCancel={() => setRemoveSessionId(null)}
      />
    </>
  );
}
