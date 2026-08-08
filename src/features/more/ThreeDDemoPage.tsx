import { lazy, Suspense, useState } from "react";
import { ExerciseAnimation } from "../../components/exercise/ExerciseAnimation";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip, SegmentedControl } from "../../components/ui/inputs";
import { ANIMATION_TYPES, type AnimationType } from "../../models/exercise";

// three enters the app ONLY through this lazy chunk (§104: 3D never blocks core).
const ExerciseCoach3D = lazy(() => import("../../components/exercise3d"));

const TYPE_LABELS: Record<AnimationType, string> = {
  push: "Drücken",
  pull: "Ziehen",
  squat: "Kniebeuge",
  hinge: "Hüftbeugen",
  press: "Überkopfdrücken",
  curl: "Curl",
  crunch: "Crunch",
  plank: "Plank",
  raise: "Heben",
  lunges: "Ausfallschritt",
};

function Loading3D() {
  return (
    <div
      aria-hidden="true"
      className="skeleton"
      style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
    />
  );
}

export default function ThreeDDemoPage() {
  const [type, setType] = useState<AnimationType>("squat");
  const [mode, setMode] = useState<"3d" | "2d">("3d");

  return (
    <>
      <PageHeader title="3D Coach" back backFallback="/more" />

      <SegmentedControl
        ariaLabel="Ansicht"
        options={[
          { value: "3d", label: "3D" },
          { value: "2d", label: "Figur" },
        ]}
        value={mode}
        onChange={setMode}
      />

      <Card style={{ position: "relative", height: 340, padding: 0, overflow: "hidden", marginTop: 14 }}>
        {mode === "3d" ? (
          <Suspense fallback={<Loading3D />}>
            <ExerciseCoach3D type={type} />
          </Suspense>
        ) : (
          <div style={{ padding: 18, height: "100%" }}>
            <ExerciseAnimation type={type} isPlaying />
          </div>
        )}
      </Card>

      <div className="chip-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
        {ANIMATION_TYPES.map((t) => (
          <Chip
            key={t}
            label={TYPE_LABELS[t]}
            selected={t === type}
            onClick={() => setType(t)}
          />
        ))}
      </div>

      <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 16 }}>
        Der 3D-Coach zeigt das Bewegungsmuster jeder Übung — Kamera drehen mit
        einem Finger, zoomen mit zwei.
      </p>
    </>
  );
}
