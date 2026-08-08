import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Beef,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Dumbbell,
  Flame,
  Heart,
  HeartPulse,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button, IconButton } from "../../components/ui/Button";
import { SegmentedControl } from "../../components/ui/inputs";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { useToast } from "../../components/feedback/ToastProvider";
import {
  FITNESS_GOALS,
  NUTRITION_TRACKING_MODES,
  type FitnessGoal,
  type NutritionTrackingMode,
  type TrainingLocation,
} from "../../models";
import {
  goalRepository,
  profileRepository,
  settingsRepository,
} from "../../services/storage";
import { DEFAULT_GOAL, seedDemoData } from "../../services/demoData/seed";
import {
  fitnessGoalLabels,
  nutritionTrackingModeLabels,
  trainingLocationLabels,
} from "../../utils/labels";

const TOTAL_STEPS = 5;
const DAY_OPTIONS = [2, 3, 4, 5, 6] as const;

const goalIcons: Record<FitnessGoal, LucideIcon> = {
  buildMuscle: Dumbbell,
  loseFat: Flame,
  maintain: Scale,
  strength: Zap,
  endurance: HeartPulse,
  health: Heart,
};

const goalHints: Record<FitnessGoal, string> = {
  buildMuscle: "Mehr Muskelmasse und Volumen aufbauen",
  loseFat: "Kalorien im Blick, Gewicht reduzieren",
  maintain: "Aktuelle Form halten und festigen",
  strength: "Schwerer heben, stärker werden",
  endurance: "Kondition und Durchhaltevermögen steigern",
  health: "Fitter und gesünder im Alltag",
};

const trackingIcons: Record<NutritionTrackingMode, LucideIcon> = {
  calories: Flame,
  protein: Beef,
  mealPlan: CalendarDays,
  simple: ClipboardList,
};

const trackingHints: Record<NutritionTrackingMode, string> = {
  calories: "Kalorien und Makros im Detail erfassen",
  protein: "Fokus auf die tägliche Proteinzufuhr",
  mealPlan: "Mit Wochenplan und Rezepten arbeiten",
  simple: "Mahlzeiten ohne Detailzahlen festhalten",
};

const locationOptions: { value: TrainingLocation; label: string }[] = [
  { value: "home", label: trainingLocationLabels.home },
  { value: "gym", label: trainingLocationLabels.gym },
  { value: "both", label: trainingLocationLabels.both },
];

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}

/** Large selectable card (goal / tracking mode) — full-width touch target. */
function OptionCard({ icon: Icon, title, text, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        minHeight: 68,
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: selected ? "rgba(239, 68, 68, 0.12)" : "var(--surface)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--border-soft)"}`,
        color: "var(--text)",
        transition:
          "background 140ms var(--ease), border-color 140ms var(--ease)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          background: selected
            ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
            : "var(--surface-2)",
          color: selected ? "#ffffff" : "var(--text-muted)",
          transition: "background 140ms var(--ease), color 140ms var(--ease)",
        }}
      >
        <Icon size={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{title}</span>
        <span
          style={{
            display: "block",
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 2,
          }}
        >
          {text}
        </span>
      </span>
      {selected ? <Check size={20} color="var(--accent)" aria-hidden /> : null}
    </button>
  );
}

function StepHeading({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ margin: "18px 0" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 6 }}>{text}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-row">
      <div className="list-row__body">
        <div className="list-row__subtitle">{label}</div>
        <div className="list-row__title">{value}</div>
      </div>
    </div>
  );
}

const optionListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [demoChoice, setDemoChoice] = useState(false);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>("buildMuscle");
  const [trainingLocation, setTrainingLocation] = useState<TrainingLocation>("gym");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(3);
  const [nutritionTrackingMode, setNutritionTrackingMode] =
    useState<NutritionTrackingMode>("calories");
  const [saving, setSaving] = useState(false);

  async function handleSkip() {
    if (saving) return;
    setSaving(true);
    try {
      await settingsRepository.updateMetadata({ onboardingCompleted: true });
      navigate("/today");
    } catch {
      setSaving(false);
      showToast("Das hat leider nicht geklappt. Bitte erneut versuchen.");
    }
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      // Demo data first: it may seed a default nutrition goal we then align.
      if (demoChoice) await seedDemoData();

      await profileRepository.create({
        fitnessGoal,
        trainingLocation,
        trainingDaysPerWeek,
        nutritionTrackingMode,
      });

      const existingGoal = await goalRepository.getCurrent();
      if (!existingGoal) {
        await goalRepository.create({ ...DEFAULT_GOAL, goalType: fitnessGoal });
      } else if (existingGoal.goalType !== fitnessGoal) {
        await goalRepository.update(existingGoal.id, { goalType: fitnessGoal });
      }

      await settingsRepository.updateMetadata({
        onboardingCompleted: true,
        onboardingVersion: 1,
      });
      navigate("/today", { replace: true });
    } catch {
      setSaving(false);
      showToast("Einrichtung fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  return (
    <div style={{ paddingBottom: step === 1 ? 0 : 96 }}>
      {/* Progress header — back button from step 2 on. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 2px" }}>
        {step > 1 ? (
          <IconButton label="Zurück" onClick={() => setStep(step - 1)} disabled={saving}>
            <ChevronLeft size={24} />
          </IconButton>
        ) : null}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            Schritt {step} von {TOTAL_STEPS}
          </div>
          <ProgressBar fraction={step / TOTAL_STEPS} />
        </div>
      </div>

      {step === 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100dvh - 190px)",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 18,
              padding: "28px 0",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 76,
                height: 76,
                borderRadius: 24,
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#ffffff",
                boxShadow: "0 12px 32px rgba(239, 68, 68, 0.35)",
              }}
            >
              <Dumbbell size={38} />
            </span>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                RED
              </span>{" "}
              Fit
            </h1>
            <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 300 }}>
              Training und Ernährung in einer App.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 20 }}>
            <Button
              onClick={() => {
                setDemoChoice(false);
                setStep(2);
              }}
            >
              Loslegen
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDemoChoice(true);
                setStep(2);
              }}
            >
              Demo-Daten verwenden
            </Button>
            <Button variant="ghost" onClick={handleSkip} disabled={saving}>
              Überspringen
            </Button>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-soft)",
                textAlign: "center",
                maxWidth: 320,
                margin: "0 auto",
              }}
            >
              Demo-Daten füllen RED Fit mit Beispielplänen, Workouts und Messwerten —
              ideal zum Ausprobieren.
            </p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <>
          <StepHeading
            title="Was ist dein Ziel?"
            text="Wir passen Vorlagen und Empfehlungen daran an."
          />
          <div style={optionListStyle}>
            {FITNESS_GOALS.map((goal) => (
              <OptionCard
                key={goal}
                icon={goalIcons[goal]}
                title={fitnessGoalLabels[goal]}
                text={goalHints[goal]}
                selected={goal === fitnessGoal}
                onClick={() => setFitnessGoal(goal)}
              />
            ))}
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepHeading
            title="Wie trainierst du?"
            text="Ort und Häufigkeit deines Trainings."
          />
          <div className="field">
            <span className="field__label">Wo trainierst du?</span>
            <SegmentedControl
              ariaLabel="Trainingsort"
              options={locationOptions}
              value={trainingLocation}
              onChange={setTrainingLocation}
            />
          </div>
          <div className="field" style={{ marginTop: 20 }}>
            <span className="field__label">Wie viele Tage pro Woche?</span>
            <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Trainingstage pro Woche">
              {DAY_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className="chip"
                  aria-pressed={days === trainingDaysPerWeek}
                  onClick={() => setTrainingDaysPerWeek(days)}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    justifyContent: "center",
                    fontSize: 17,
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  {days}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {trainingDaysPerWeek} Trainingstage pro Woche
            </p>
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <StepHeading
            title="Wie trackst du deine Ernährung?"
            text="Du kannst das jederzeit in den Einstellungen ändern."
          />
          <div style={optionListStyle}>
            {NUTRITION_TRACKING_MODES.map((mode) => (
              <OptionCard
                key={mode}
                icon={trackingIcons[mode]}
                title={nutritionTrackingModeLabels[mode]}
                text={trackingHints[mode]}
                selected={mode === nutritionTrackingMode}
                onClick={() => setNutritionTrackingMode(mode)}
              />
            ))}
          </div>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <StepHeading
            title="Alles bereit!"
            text="So richten wir RED Fit für dich ein."
          />
          <div className="card">
            <SummaryRow label="Ziel" value={fitnessGoalLabels[fitnessGoal]} />
            <SummaryRow
              label="Trainingsort"
              value={trainingLocationLabels[trainingLocation]}
            />
            <SummaryRow
              label="Trainingstage"
              value={`${trainingDaysPerWeek} Tage pro Woche`}
            />
            <SummaryRow
              label="Ernährung"
              value={nutritionTrackingModeLabels[nutritionTrackingMode]}
            />
            <SummaryRow
              label="Demo-Daten"
              value={demoChoice ? "Werden eingerichtet" : "Keine"}
            />
          </div>
          <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 14 }}>
            Alle Daten bleiben lokal auf deinem Gerät gespeichert.
          </p>
        </>
      ) : null}

      {step > 1 ? (
        <div className="action-bar">
          <div className="action-bar__inner">
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep(step + 1)}>Weiter</Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving}>
                {saving ? "Wird eingerichtet…" : "RED Fit starten"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
