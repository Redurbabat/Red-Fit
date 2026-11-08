import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field, NumberInput } from "../../components/ui/inputs";
import {
  ACTIVITY_FACTORS,
  calculateEnergyGoal,
  type ActivityLevel,
  type EnergyEstimate,
  type EnergyGoalDirection,
  type FormulaVariant,
} from "../../services/calculations/energyGoal";
import { parseDecimalInput } from "../../utils/numbers";

interface Props {
  onApply: (estimate: EnergyEstimate) => void;
}

export default function EnergyGoalCalculator({ onApply }: Props) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [formulaVariant, setFormulaVariant] = useState<FormulaVariant>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("lightlyActive");
  const [direction, setDirection] = useState<EnergyGoalDirection>("maintain");
  const [estimate, setEstimate] = useState<EnergyEstimate | null>(null);
  const [error, setError] = useState("");

  function calculate() {
    try {
      const result = calculateEnergyGoal({
        weightKg: parseDecimalInput(weight) ?? NaN,
        heightCm: parseDecimalInput(height) ?? NaN,
        ageYears: parseDecimalInput(age) ?? NaN,
        formulaVariant,
        activityLevel,
        direction,
      });
      setEstimate(result);
      setError("");
    } catch {
      setEstimate(null);
      setError("Bitte gültige Werte angeben (Alter ab 18 Jahren).");
    }
  }

  return (
    <Card>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 12 }}>
        Schätzung nach Mifflin-St Jeor. Das Ergebnis übernimmt keine Werte automatisch
        und ersetzt keine individuelle Ernährungsberatung.
      </p>
      <Field label="Gewicht (kg)">
        {(id) => <NumberInput id={id} value={weight} onChange={(e) => setWeight(e.target.value)} />}
      </Field>
      <Field label="Größe (cm)">
        {(id) => <NumberInput id={id} value={height} onChange={(e) => setHeight(e.target.value)} />}
      </Field>
      <Field label="Alter (Jahre)">
        {(id) => <NumberInput id={id} value={age} onChange={(e) => setAge(e.target.value)} />}
      </Field>
      <Field label="Berechnungsvariante">
        {(id) => (
          <select id={id} className="input" value={formulaVariant}
            onChange={(e) => setFormulaVariant(e.target.value as FormulaVariant)}>
            <option value="male">Männliche Formel</option>
            <option value="female">Weibliche Formel</option>
          </select>
        )}
      </Field>
      <Field label="Alltagsaktivität">
        {(id) => (
          <select id={id} className="input" value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
            {Object.keys(ACTIVITY_FACTORS).map((key) => {
              const labels: Record<ActivityLevel, string> = {
                sedentary: "Überwiegend sitzend",
                lightlyActive: "Leicht aktiv",
                moderatelyActive: "Moderat aktiv",
                veryActive: "Sehr aktiv",
              };
              return <option value={key} key={key}>{labels[key as ActivityLevel]}</option>;
            })}
          </select>
        )}
      </Field>
      <Field label="Ziel">
        {(id) => (
          <select id={id} className="input" value={direction}
            onChange={(e) => setDirection(e.target.value as EnergyGoalDirection)}>
            <option value="lose">Gewicht reduzieren</option>
            <option value="maintain">Gewicht halten</option>
            <option value="gain">Gewicht aufbauen</option>
          </select>
        )}
      </Field>
      {error ? <p role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <Button variant="secondary" onClick={calculate}>Bedarf berechnen</Button>
      {estimate ? (
        <div aria-live="polite" style={{ marginTop: 14 }}>
          <p><strong>Grundumsatz:</strong> {estimate.basalKcal} kcal</p>
          <p><strong>Geschätzter Gesamtumsatz:</strong> {estimate.maintenanceKcal} kcal</p>
          <p><strong>Ziel:</strong> {estimate.dailyKcal} kcal pro Tag</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            Protein {estimate.dailyProtein} g · Fett {estimate.dailyFat} g ·
            Kohlenhydrate {estimate.dailyCarbs} g
          </p>
          <Button onClick={() => onApply(estimate)}>Werte ins Ernährungsziel übernehmen</Button>
        </div>
      ) : null}
    </Card>
  );
}
