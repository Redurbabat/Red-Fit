import { useLiveQuery } from "dexie-react-hooks";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { WorkoutPlan } from "../../../models";
import {
  instantiateTemplate,
  PLAN_TEMPLATES,
  type PlanTemplate,
} from "../../../services/demoData/planTemplates";
import { db, exerciseRepository, workoutPlanRepository } from "../../../services/storage";
import {
  difficultyLabels,
  fitnessGoalLabels,
  trainingLocationLabels,
} from "../../../utils/labels";

/** Non-interactive "Aktiv" badge in chip look (sits next to real buttons). */
function ActiveBadge() {
  return (
    <span
      className="chip"
      style={{
        background: "rgba(239, 68, 68, 0.14)",
        borderColor: "var(--accent)",
        color: "var(--text)",
        minHeight: 28,
        fontSize: 13,
      }}
    >
      Aktiv
    </span>
  );
}

export default function PlanListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const plans = useLiveQuery(() => db.workoutPlans.toArray(), []);

  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);
  const [copyingKey, setCopyingKey] = useState<string | null>(null);

  async function handleActivate(plan: WorkoutPlan) {
    try {
      await workoutPlanRepository.activate(plan.id);
      showToast("Plan aktiviert.");
    } catch {
      showToast("Plan konnte nicht aktiviert werden. Bitte versuche es erneut.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await workoutPlanRepository.delete(deleteTarget.id);
      showToast("Plan gelöscht.");
    } catch {
      showToast("Plan konnte nicht gelöscht werden. Bitte versuche es erneut.");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleCopyTemplate(template: PlanTemplate) {
    if (copyingKey) return;
    setCopyingKey(template.key);
    try {
      // Templates are never mutated — copying always builds a fresh plan.
      const exercises = await exerciseRepository.list();
      const plan = instantiateTemplate(template, exercises, false);
      await workoutPlanRepository.put(plan);
      showToast("Vorlage kopiert.");
      navigate(`/training/plans/${plan.id}`);
    } catch {
      showToast("Vorlage konnte nicht kopiert werden. Bitte versuche es erneut.");
    } finally {
      setCopyingKey(null);
    }
  }

  return (
    <>
      <PageHeader title="Trainingspläne" back />

      {plans === undefined ? (
        <LoadingState rows={3} />
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarRange}
            title="Noch keine Trainingspläne"
            text="Erstelle deinen ersten Plan oder kopiere unten eine Vorlage."
            action={{ label: "Plan erstellen", onClick: () => navigate("/training/plans/new") }}
          />
        </Card>
      ) : (
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          {plans.map((plan) => (
            <div key={plan.id} className="list-row">
              <button
                type="button"
                className="list-row__body"
                style={{ minHeight: 44, alignSelf: "stretch" }}
                onClick={() => navigate(`/training/plans/${plan.id}`)}
              >
                <div className="list-row__title">{plan.name}</div>
                <div className="list-row__subtitle">
                  {fitnessGoalLabels[plan.goal]} · {plan.daysPerWeek}× pro Woche
                </div>
              </button>
              <div className="list-row__trailing">
                {plan.active ? (
                  <ActiveBadge />
                ) : (
                  <Button
                    variant="secondary"
                    small
                    autoWidth
                    onClick={() => handleActivate(plan)}
                  >
                    Aktivieren
                  </Button>
                )}
                <IconButton
                  label={`Plan „${plan.name}“ löschen`}
                  onClick={() => setDeleteTarget(plan)}
                >
                  <Trash2 size={20} color="var(--danger)" />
                </IconButton>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ marginTop: 14 }}>
        <Button onClick={() => navigate("/training/plans/new")}>
          <Plus size={18} aria-hidden="true" /> Plan erstellen
        </Button>
      </div>

      <SectionHeader title="Vorlagen" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PLAN_TEMPLATES.map((template) => (
          <Card key={template.key}>
            <p style={{ fontSize: 17, fontWeight: 700 }}>{template.name}</p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
              {difficultyLabels[template.level]} · {template.daysPerWeek}× pro Woche ·{" "}
              {trainingLocationLabels[template.location]}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 6 }}>
              {template.sessions.map((s) => s.name).join(" · ")}
            </p>
            <div style={{ marginTop: 12 }}>
              <Button
                variant="secondary"
                small
                autoWidth
                disabled={copyingKey !== null}
                onClick={() => handleCopyTemplate(template)}
              >
                {copyingKey === template.key ? "Wird kopiert …" : "Vorlage kopieren"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Plan löschen?"
        text={
          deleteTarget
            ? `„${deleteTarget.name}“ wird dauerhaft gelöscht. Abgeschlossene Workouts bleiben erhalten.`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
