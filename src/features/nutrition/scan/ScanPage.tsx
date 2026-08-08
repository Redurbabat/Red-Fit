import { Camera, PackageSearch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Field, IntegerInput } from "../../../components/ui/inputs";
import type { FoodItem } from "../../../models";
import { barcodeService } from "../../../services/barcode/barcodeService";
import { foodRepository } from "../../../services/storage";
import { formatGrams, formatKcal } from "../../../utils/numbers";

interface ScanResult {
  code: string;
  food: FoodItem | null;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Hard rule: the scanner is never required — manual entry always works.
  const cameraSupported = barcodeService.isSupported();

  const searchBarcode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (code === "") {
        setCodeError("Bitte gib einen Barcode ein.");
        return;
      }
      setCodeError(undefined);
      try {
        const food = await foodRepository.findByBarcode(code);
        setResult({ code, food: food ?? null });
      } catch {
        showToast("Suche fehlgeschlagen. Bitte versuche es erneut.");
      }
    },
    [showToast],
  );

  // Camera lifecycle: scan while `scanning` is true, abort on toggle-off,
  // page change and unmount via the effect cleanup.
  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;
    const controller = new AbortController();
    let disposed = false;

    barcodeService
      .scan(video, controller.signal)
      .then((code) => {
        if (disposed) return;
        setScanning(false);
        setCodeInput(code);
        void searchBarcode(code);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setScanning(false);
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!aborted) {
          setCameraError("Kamera nicht verfügbar. Du kannst den Barcode manuell eingeben.");
        }
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [scanning, searchBarcode]);

  function startCamera() {
    setCameraError(null);
    setResult(null);
    setScanning(true);
  }

  return (
    <>
      <PageHeader title="Scannen" back />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Wenn das Produkt nicht gefunden wird, kannst du die Nährwerte selbst
          speichern.
        </p>

        <SectionHeader title="Barcode eingeben" />
        <Field label="Barcode" error={codeError}>
          {(id) => (
            <IntegerInput
              id={id}
              value={codeInput}
              placeholder="z. B. 4000521006112"
              enterKeyHint="search"
              onChange={(e) => {
                setCodeInput(e.target.value);
                if (codeError) setCodeError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchBarcode(codeInput);
              }}
            />
          )}
        </Field>
        <Button variant="secondary" onClick={() => void searchBarcode(codeInput)}>
          Suchen
        </Button>

        {result ? (
          result.food ? (
            <Card>
              <p style={{ fontSize: 17, fontWeight: 600 }}>{result.food.name}</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                {result.food.brand ? `${result.food.brand} · ` : ""}
                {formatKcal(result.food.kcalPer100g)} / 100 g
              </p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                {formatGrams(result.food.proteinPer100g)} Protein ·{" "}
                {formatGrams(result.food.carbsPer100g)} KH ·{" "}
                {formatGrams(result.food.fatPer100g)} Fett
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}
              >
                <Button onClick={() => navigate("/nutrition/meals/add")}>
                  Zur Mahlzeit hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/nutrition/foods/${result.food?.id}`)}
                >
                  Ansehen
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PackageSearch size={22} aria-hidden="true" />
                <p style={{ fontSize: 17, fontWeight: 600 }}>Nicht gefunden</p>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                Für den Barcode {result.code} ist noch kein Lebensmittel gespeichert.
              </p>
              <div style={{ marginTop: 14 }}>
                <Button
                  onClick={() =>
                    navigate(`/nutrition/foods/new?barcode=${encodeURIComponent(result.code)}`)
                  }
                >
                  Lebensmittel erstellen
                </Button>
              </div>
            </Card>
          )
        ) : null}

        <SectionHeader title="Mit Kamera scannen" />

        {cameraSupported ? (
          <>
            {scanning ? (
              <Card>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: 300,
                    objectFit: "cover",
                    borderRadius: "var(--radius-sm)",
                    background: "#000",
                    display: "block",
                  }}
                />
                <div style={{ marginTop: 12 }}>
                  <Button variant="ghost" onClick={() => setScanning(false)}>
                    Scan abbrechen
                  </Button>
                </div>
              </Card>
            ) : (
              <Button variant="secondary" onClick={startCamera}>
                <Camera size={18} aria-hidden="true" style={{ marginRight: 6 }} />
                Kamera öffnen
              </Button>
            )}
            {cameraError ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{cameraError}</p>
            ) : null}
          </>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Dein Browser unterstützt keinen Kamera-Scan. Nutze die manuelle Eingabe.
          </p>
        )}
      </div>
    </>
  );
}
