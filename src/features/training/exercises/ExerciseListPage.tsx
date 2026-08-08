import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Dumbbell, Plus } from "lucide-react";
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
                    {exercise.isCustom ? " · Eigene Übung" : ""}
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
        open={sheetOpen}
        title="Eigene Übung"
        onClose={() => setSheetOpen(false)}
      >
        <ExerciseForm submitLabel="Übung speichern" onSubmit={handleCreate} />
      </BottomSheet>
    </>
  );
}
