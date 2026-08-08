import {
  Apple,
  Droplets,
  Dumbbell,
  HeartPulse,
  Plus,
  Scale,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bodyRepository, waterRepository } from "../../services/storage";
import { getLocalDateKey, nowIso } from "../../utils/dates";
import { parseDecimalInput, roundTo } from "../../utils/numbers";
import { RecoveryCheckinSheet } from "../body/RecoveryCheckinSheet";
import { BottomSheet } from "../feedback/Modal";
import { useToast } from "../feedback/ToastProvider";
import { Button } from "../ui/Button";
import { Field, NumberInput } from "../ui/inputs";

type QuickActionId = "workout" | "meal" | "water" | "weight" | "recovery" | "food";

interface QuickAction {
  id: QuickActionId;
  icon: LucideIcon;
  label: string;
  subtitle: string;
}

const ACTIONS: Record<QuickActionId, QuickAction> = {
  workout: {
    id: "workout",
    icon: Dumbbell,
    label: "Training starten",
    subtitle: "Zum Trainingsbereich",
  },
  meal: {
    id: "meal",
    icon: Utensils,
    label: "Mahlzeit loggen",
    subtitle: "Lebensmittel suchen und Menge wählen",
  },
  water: {
    id: "water",
    icon: Droplets,
    label: "Wasser +250 ml",
    subtitle: "Direkt speichern",
  },
  weight: {
    id: "weight",
    icon: Scale,
    label: "Gewicht erfassen",
    subtitle: "Heutiges Körpergewicht",
  },
  recovery: {
    id: "recovery",
    icon: HeartPulse,
    label: "Recovery Check-in",
    subtitle: "Schlaf, Energie, Stress, Muskelkater",
  },
  food: {
    id: "food",
    icon: Apple,
    label: "Lebensmittel anlegen",
    subtitle: "Neues Food mit Nährwerten pro 100 g",
  },
};

/** Context-aware order (§10): the current tab's actions come first. */
function actionOrderFor(pathname: string): QuickActionId[] {
  if (pathname.startsWith("/nutrition")) {
    return ["meal", "water", "food", "workout", "weight", "recovery"];
  }
  if (pathname.startsWith("/training") || pathname.startsWith("/progress")) {
    return ["workout", "meal", "water", "weight", "recovery", "food"];
  }
  if (pathname.startsWith("/body")) {
    return ["weight", "recovery", "water", "meal", "workout", "food"];
  }
  return ["workout", "meal", "water", "weight", "recovery", "food"];
}

/** Global quick log: floating + button opening a prioritized action sheet. */
export function QuickLogButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightError, setWeightError] = useState<string | undefined>(undefined);

  async function handleAction(id: QuickActionId) {
    setSheetOpen(false);
    switch (id) {
      case "workout":
        navigate("/training");
        break;
      case "meal":
        navigate("/nutrition/meals/add");
        break;
      case "food":
        navigate("/nutrition/foods/new");
        break;
      case "water":
        try {
          await waterRepository.create({
            date: getLocalDateKey(),
            amountMl: 250,
            loggedAt: nowIso(),
          });
          showToast("250 ml Wasser hinzugefügt.");
        } catch {
          showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
        }
        break;
      case "weight":
        setWeightInput("");
        setWeightError(undefined);
        setWeightOpen(true);
        break;
      case "recovery":
        setRecoveryOpen(true);
        break;
    }
  }

  async function saveWeight() {
    const value = parseDecimalInput(weightInput);
    if (value == null || value <= 0 || value > 500) {
      setWeightError("Bitte gib ein gültiges Gewicht in Kilogramm ein.");
      return;
    }
    try {
      await bodyRepository.create({
        date: getLocalDateKey(),
        weightKg: roundTo(value, 1),
      });
      setWeightOpen(false);
      showToast("Gewicht gespeichert.");
    } catch {
      setWeightError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="fab"
        aria-label="Schnell erfassen"
        onClick={() => setSheetOpen(true)}
      >
        <Plus size={28} aria-hidden="true" />
      </button>

      <BottomSheet
        open={sheetOpen}
        title="Schnell erfassen"
        onClose={() => setSheetOpen(false)}
      >
        {actionOrderFor(location.pathname).map((id) => {
          const action = ACTIONS[id];
          return (
            <button
              key={id}
              type="button"
              className="list-row"
              onClick={() => void handleAction(id)}
            >
              <action.icon size={20} color="var(--accent)" aria-hidden="true" />
              <span className="list-row__body">
                <span className="list-row__title">{action.label}</span>
                <span className="list-row__subtitle">{action.subtitle}</span>
              </span>
            </button>
          );
        })}
      </BottomSheet>

      <BottomSheet
        open={weightOpen}
        title="Gewicht erfassen"
        onClose={() => setWeightOpen(false)}
      >
        <Field label="Gewicht (kg)" error={weightError}>
          {(id) => (
            <NumberInput
              id={id}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="z. B. 78,4"
              autoFocus
            />
          )}
        </Field>
        <Button onClick={() => void saveWeight()} style={{ marginTop: 12 }}>
          Speichern
        </Button>
      </BottomSheet>

      <RecoveryCheckinSheet open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </>
  );
}
