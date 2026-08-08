import { useLiveQuery } from "dexie-react-hooks";
import { Plus, SearchX, Star, StarOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { TextInput } from "../../../components/ui/inputs";
import type { FoodItem } from "../../../models";
import { foodRepository } from "../../../services/storage";
import { formatKcal } from "../../../utils/numbers";

interface FoodRowProps {
  food: FoodItem;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

/**
 * One food entry: the body opens the detail form, the trailing star toggles
 * the favorite flag. Two separate buttons — never nested (invalid HTML).
 */
function FoodRow({ food, onOpen, onToggleFavorite }: FoodRowProps) {
  return (
    <div className="list-row">
      <button
        type="button"
        className="list-row__body"
        style={{ textAlign: "left", minHeight: 44 }}
        onClick={onOpen}
      >
        <span className="list-row__title" style={{ display: "block" }}>
          {food.name}
        </span>
        {food.brand ? (
          <span className="list-row__subtitle" style={{ display: "block" }}>
            {food.brand}
          </span>
        ) : null}
      </button>
      <span className="list-row__trailing">
        <span>{formatKcal(food.kcalPer100g)} / 100 g</span>
        <IconButton
          label={
            food.favorite
              ? `${food.name} aus Favoriten entfernen`
              : `${food.name} zu Favoriten hinzufügen`
          }
          onClick={onToggleFavorite}
        >
          {food.favorite ? (
            <Star size={20} fill="currentColor" style={{ color: "var(--accent-2)" }} />
          ) : (
            <StarOff size={20} />
          )}
        </IconButton>
      </span>
    </div>
  );
}

export default function FoodListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");

  // Reactive: re-runs on every keystroke and on every DB change.
  const foods = useLiveQuery(() => foodRepository.search(query), [query]);
  const recentFoods = useLiveQuery(() => foodRepository.listRecent(6), []);

  const trimmedQuery = query.trim();
  const favorites = (foods ?? []).filter((food) => food.favorite);
  const recent = trimmedQuery === "" ? (recentFoods ?? []) : [];

  async function toggleFavorite(food: FoodItem) {
    try {
      await foodRepository.update(food.id, { favorite: !food.favorite });
    } catch {
      showToast("Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.");
    }
  }

  const openFood = (food: FoodItem) => navigate(`/nutrition/foods/${food.id}`);

  return (
    <>
      <PageHeader
        title="Lebensmittel"
        back
        subtitle={
          foods
            ? foods.length === 1
              ? "1 Eintrag"
              : `${foods.length} Einträge`
            : undefined
        }
        trailing={
          <IconButton
            label="Lebensmittel erstellen"
            onClick={() => navigate("/nutrition/foods/new")}
          >
            <Plus size={22} />
          </IconButton>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TextInput
          value={query}
          placeholder="Name, Marke oder Barcode suchen …"
          aria-label="Lebensmittel suchen"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
        />

        {foods === undefined ? (
          <LoadingState rows={6} />
        ) : foods.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Kein Lebensmittel gefunden."
            text={
              trimmedQuery === ""
                ? "Lege dein erstes Lebensmittel an, um Mahlzeiten zu erfassen."
                : `Für „${trimmedQuery}“ gibt es keinen Treffer.`
            }
            action={{
              label: "Lebensmittel erstellen",
              onClick: () => navigate("/nutrition/foods/new"),
            }}
          />
        ) : (
          <>
            {favorites.length > 0 ? (
              <>
                <SectionHeader title="Favoriten" />
                <Card>
                  {favorites.map((food) => (
                    <FoodRow
                      key={food.id}
                      food={food}
                      onOpen={() => openFood(food)}
                      onToggleFavorite={() => void toggleFavorite(food)}
                    />
                  ))}
                </Card>
              </>
            ) : null}

            {recent.length > 0 ? (
              <>
                <SectionHeader title="Zuletzt verwendet" />
                <Card>
                  {recent.map((food) => (
                    <FoodRow
                      key={food.id}
                      food={food}
                      onOpen={() => openFood(food)}
                      onToggleFavorite={() => void toggleFavorite(food)}
                    />
                  ))}
                </Card>
              </>
            ) : null}

            <SectionHeader title="Alle Lebensmittel" />
            <Card>
              {foods.map((food) => (
                <FoodRow
                  key={food.id}
                  food={food}
                  onOpen={() => openFood(food)}
                  onToggleFavorite={() => void toggleFavorite(food)}
                />
              ))}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
