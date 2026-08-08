import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { ExerciseAnimation } from "../../components/exercise/ExerciseAnimation";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { IconButton } from "../../components/ui/Button";
import { Chip } from "../../components/ui/inputs";
import { ANIMATION_TYPES, type AnimationType } from "../../models/exercise";

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

export default function ThreeDDemoPage() {
  const [type, setType] = useState<AnimationType>("squat");
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <>
      <PageHeader title="3D Coach" back backFallback="/more" />

      <Card style={{ position: "relative", height: 300 }}>
        <ExerciseAnimation type={type} isPlaying={isPlaying} />
        <div style={{ position: "absolute", bottom: 10, right: 10 }}>
          <IconButton
            label={isPlaying ? "Animation pausieren" : "Animation abspielen"}
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </IconButton>
        </div>
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
        Hier entsteht der 3D-Coach. Die Bewegungsfiguren zeigen die Grundmuster
        jeder Übung — die vollständige 3D-Ansicht mit drehbarer Kamera folgt.
      </p>
    </>
  );
}
