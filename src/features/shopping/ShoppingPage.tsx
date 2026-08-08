import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet, ConfirmDialog } from "../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { NumberInput, SelectInput, TextInput } from "../../components/ui/inputs";
import type { ShoppingItem, ShoppingList } from "../../models";
import { db, shoppingRepository } from "../../services/storage";
import { newId } from "../../utils/ids";
import { parseDecimalInput, roundTo } from "../../utils/numbers";

const UNITS = ["g", "ml", "Stück"] as const;

function formatItemAmount(item: ShoppingItem): string | null {
  if (item.amount == null) return null;
  const amount = item.amount.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return item.unit ? `${amount} ${item.unit}` : amount;
}

export default function ShoppingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const lists = useLiveQuery(() => shoppingRepository.listNewestFirst(), []);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [hideDone, setHideDone] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClearDone, setConfirmClearDone] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingList | null>(null);

  // Add-item row state.
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [unitInput, setUnitInput] = useState<string>("g");
  const [addError, setAddError] = useState<string | undefined>(undefined);

  const list = useMemo(() => {
    if (!lists || lists.length === 0) return undefined;
    return lists.find((l) => l.id === selectedListId) ?? lists[0];
  }, [lists, selectedListId]);

  async function createList(fromPicker: boolean) {
    try {
      const created = await shoppingRepository.create({ title: "Einkaufsliste", items: [] });
      setSelectedListId(created.id);
      if (fromPicker) setPickerOpen(false);
      showToast("Neue Liste erstellt.");
    } catch {
      showToast("Liste konnte nicht erstellt werden. Bitte versuche es erneut.");
    }
  }

  async function updateItems(updater: (items: ShoppingItem[]) => ShoppingItem[]) {
    if (!list) return;
    const listId = list.id;
    // Keep working on this list even though the update bumps it to the top.
    setSelectedListId(listId);
    try {
      // Read-modify-write on the fresh DB state inside one transaction so two
      // quick taps never overwrite each other with stale rendered items.
      await db.transaction("rw", db.shoppingLists, async () => {
        const fresh = await shoppingRepository.get(listId);
        if (!fresh) return;
        await shoppingRepository.update(listId, { items: updater(fresh.items) });
      });
    } catch {
      showToast("Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.");
    }
  }

  async function toggleItem(item: ShoppingItem) {
    await updateItems((items) =>
      items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    );
  }

  async function removeItem(item: ShoppingItem) {
    await updateItems((items) => items.filter((i) => i.id !== item.id));
  }

  async function addItem() {
    if (!list) return;
    const name = nameInput.trim();
    if (name === "") {
      setAddError("Bitte gib einen Namen ein.");
      return;
    }
    const item: ShoppingItem = { id: newId(), name, checked: false };
    if (amountInput.trim() !== "") {
      const amount = parseDecimalInput(amountInput);
      if (amount == null || amount <= 0) {
        setAddError("Bitte gib eine gültige Menge ein.");
        return;
      }
      item.amount = roundTo(amount, 1);
      item.unit = unitInput;
    }
    setAddError(undefined);
    await updateItems((items) => [...items, item]);
    setNameInput("");
    setAmountInput("");
  }

  async function clearDone() {
    await updateItems((items) => items.filter((i) => !i.checked));
    setConfirmClearDone(false);
    showToast("Erledigte Artikel gelöscht.");
  }

  async function resetAll() {
    await updateItems((items) => items.map((i) => ({ ...i, checked: false })));
  }

  async function deleteList() {
    if (!deleteTarget) return;
    try {
      await shoppingRepository.delete(deleteTarget.id);
      if (selectedListId === deleteTarget.id) setSelectedListId(null);
      setDeleteTarget(null);
      showToast("Liste gelöscht.");
    } catch {
      showToast("Liste konnte nicht gelöscht werden. Bitte versuche es erneut.");
    }
  }

  if (lists === undefined) {
    return (
      <>
        <PageHeader title="Einkaufsliste" />
        <LoadingState rows={5} />
      </>
    );
  }

  if (!list) {
    return (
      <>
        <PageHeader title="Einkaufsliste" />
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Noch keine Einkaufsliste"
            text="Erstelle eine leere Liste oder lass sie aus deinem Essensplan erzeugen."
            action={{ label: "Neue Liste", onClick: () => void createList(false) }}
          >
            <Button
              variant="ghost"
              autoWidth
              onClick={() => navigate("/nutrition/meal-plan")}
            >
              Zum Essensplan
            </Button>
          </EmptyState>
        </Card>
      </>
    );
  }

  const doneCount = list.items.filter((i) => i.checked).length;
  const visibleItems = hideDone ? list.items.filter((i) => !i.checked) : list.items;

  return (
    <>
      <PageHeader title="Einkaufsliste" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card flat>
          <button
            type="button"
            className="list-row"
            style={{ minHeight: 44 }}
            onClick={() => setPickerOpen(true)}
            aria-label="Liste wechseln oder verwalten"
          >
            <span className="list-row__body" style={{ display: "block", textAlign: "left" }}>
              <span className="list-row__title" style={{ display: "block" }}>
                {list.title}
              </span>
              <span className="list-row__subtitle" style={{ display: "block" }}>
                {list.items.length === 0
                  ? "Keine Artikel"
                  : `${doneCount} von ${list.items.length} erledigt`}
              </span>
            </span>
            <span className="list-row__trailing">
              <ChevronDown size={20} aria-hidden="true" />
            </span>
          </button>
        </Card>

        {list.items.length === 0 ? (
          <Card>
            <EmptyState
              icon={ShoppingCart}
              title="Noch keine Artikel"
              text="Füge unten Artikel hinzu oder erstelle die Liste aus dem Essensplan."
              action={{ label: "Zum Essensplan", onClick: () => navigate("/nutrition/meal-plan") }}
            />
          </Card>
        ) : (
          <Card>
            {visibleItems.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "10px 0" }}>
                Alle Artikel sind erledigt.
              </p>
            ) : (
              visibleItems.map((item) => (
                <div className="list-row" key={item.id}>
                  <IconButton
                    label={item.checked ? `${item.name} wieder öffnen` : `${item.name} abhaken`}
                    onClick={() => void toggleItem(item)}
                  >
                    {item.checked ? (
                      <CheckCircle2 size={22} style={{ color: "var(--success)" }} />
                    ) : (
                      <Circle size={22} />
                    )}
                  </IconButton>
                  <span
                    className="list-row__body"
                    style={{
                      display: "block",
                      ...(item.checked
                        ? { textDecoration: "line-through", color: "var(--text-soft)" }
                        : {}),
                    }}
                  >
                    <span className="list-row__title" style={{ display: "block", color: "inherit" }}>
                      {item.name}
                    </span>
                    {formatItemAmount(item) ? (
                      <span className="list-row__subtitle" style={{ display: "block" }}>
                        {formatItemAmount(item)}
                      </span>
                    ) : null}
                  </span>
                  <span className="list-row__trailing">
                    <IconButton label={`${item.name} löschen`} onClick={() => void removeItem(item)}>
                      <X size={18} />
                    </IconButton>
                  </span>
                </div>
              ))
            )}
          </Card>
        )}

        <Card flat>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
            Artikel hinzufügen
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TextInput
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Artikel"
              aria-label="Artikelname"
              style={{ flex: 2, minWidth: 0 }}
            />
            <NumberInput
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Menge"
              aria-label="Menge (optional)"
              style={{ flex: 1, minWidth: 0 }}
            />
            <SelectInput
              value={unitInput}
              onChange={(e) => setUnitInput(e.target.value)}
              aria-label="Einheit"
              style={{ flex: 1, minWidth: 0 }}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </SelectInput>
            <IconButton label="Artikel hinzufügen" onClick={() => void addItem()}>
              <Plus size={22} />
            </IconButton>
          </div>
          {addError ? <p className="field__error">{addError}</p> : null}
        </Card>

        {list.items.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Button variant="ghost" small autoWidth onClick={() => setHideDone(!hideDone)}>
              {hideDone ? "Erledigte anzeigen" : "Erledigte ausblenden"}
            </Button>
            {doneCount > 0 ? (
              <>
                <Button variant="ghost" small autoWidth onClick={() => void resetAll()}>
                  Alle zurücksetzen
                </Button>
                <Button
                  variant="danger"
                  small
                  autoWidth
                  onClick={() => setConfirmClearDone(true)}
                >
                  Erledigte löschen
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <BottomSheet open={pickerOpen} title="Listen" onClose={() => setPickerOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card flat>
            {lists.map((l) => {
              const done = l.items.filter((i) => i.checked).length;
              return (
                <div className="list-row" key={l.id}>
                  <button
                    type="button"
                    className="list-row__body"
                    style={{ textAlign: "left", minHeight: 44 }}
                    onClick={() => {
                      setSelectedListId(l.id);
                      setPickerOpen(false);
                    }}
                  >
                    <span
                      className="list-row__title"
                      style={{
                        display: "block",
                        color: l.id === list.id ? "var(--accent)" : undefined,
                      }}
                    >
                      {l.title}
                    </span>
                    <span className="list-row__subtitle" style={{ display: "block" }}>
                      {l.items.length === 0
                        ? "Keine Artikel"
                        : `${done} von ${l.items.length} erledigt`}
                    </span>
                  </button>
                  <span className="list-row__trailing">
                    <IconButton
                      label={`Liste „${l.title}“ löschen`}
                      onClick={() => setDeleteTarget(l)}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </span>
                </div>
              );
            })}
          </Card>
          <Button variant="secondary" onClick={() => void createList(true)}>
            Neue Liste erstellen
          </Button>
          <Button variant="ghost" onClick={() => setPickerOpen(false)}>
            Schließen
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmClearDone}
        title="Erledigte löschen?"
        text={
          doneCount === 1
            ? "1 erledigter Artikel wird dauerhaft aus der Liste entfernt."
            : `${doneCount} erledigte Artikel werden dauerhaft aus der Liste entfernt.`
        }
        confirmLabel="Löschen"
        danger
        onConfirm={() => void clearDone()}
        onCancel={() => setConfirmClearDone(false)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Liste löschen?"
        text={
          deleteTarget
            ? `Die Liste „${deleteTarget.title}“ mit ${deleteTarget.items.length} Artikeln wird dauerhaft gelöscht.`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={() => void deleteList()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
