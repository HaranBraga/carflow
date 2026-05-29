"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
}

function extractBrazilianPlate(text: string): string | null {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Mercosul: ABC1D23
  const mercosul = clean.match(/[A-Z]{3}[0-9][A-Z][0-9]{2}/);
  if (mercosul) return mercosul[0];
  // Antiga: ABC1234
  const old = clean.match(/[A-Z]{3}[0-9]{4}/);
  if (old) return old[0];
  return null;
}

export function PlateScanner({ onPlateDetected }: PlateScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "processing" | "confirm" | "error">("idle");
  const [detected, setDetected] = useState("");
  const [rawText, setRawText] = useState("");

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!inputRef.current) inputRef.current!.value = "";
    if (!file) return;

    setState("processing");
    setDetected("");
    setRawText("");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => {},
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0_best",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@4/tesseract-core-simd-lstm.wasm.js",
      });
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "7" as any,
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const plate = extractBrazilianPlate(text);
      setRawText(text.trim());

      if (plate) {
        setDetected(plate);
        setState("confirm");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function confirm() {
    onPlateDetected(detected);
    setState("idle");
  }

  function dismiss() {
    setState("idle");
    setDetected("");
    setRawText("");
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImage}
      />

      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => inputRef.current?.click()}
          title="Fotografar placa"
        >
          <Camera className="w-4 h-4" />
        </Button>
      )}

      {state === "processing" && (
        <Button type="button" variant="outline" size="icon" disabled>
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      )}

      {state === "confirm" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex-1">
            <p className="text-xs text-green-700 font-medium">Placa detectada:</p>
            <p className="font-mono font-bold text-green-900 tracking-widest">{detected}</p>
          </div>
          <Button type="button" size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirm}>
            <CheckCircle className="w-3 h-3" /> Usar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismiss} className="text-gray-500">
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <div className="flex-1">
            <p className="text-xs text-red-700 font-medium">Não consegui ler a placa.</p>
            {rawText && <p className="text-xs text-red-500 mt-0.5">Lido: "{rawText}"</p>}
            <p className="text-xs text-red-500">Tente novamente com melhor iluminação.</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={dismiss} className="text-gray-500">
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
