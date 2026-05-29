"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, X, Loader2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
}

function extractBrazilianPlate(text: string): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const mercosul = clean.match(/[A-Z]{3}[0-9][A-Z][0-9]{2}/);
  if (mercosul) return mercosul[0];
  const old = clean.match(/[A-Z]{3}[0-9]{4}/);
  if (old) return old[0];
  // retorna o que tiver mesmo que incompleto para o usuário corrigir
  return clean.slice(0, 8);
}

async function runOCR(canvas: HTMLCanvasElement): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { logger: () => {} });

  // Tenta PSM 8 (palavra única) e PSM 13 (linha raw) e fica com o melhor
  const results: string[] = [];
  for (const psm of ["8", "13", "7"]) {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      tessedit_pageseg_mode: psm as any,
    });
    const { data: { text } } = await worker.recognize(canvas);
    const plate = extractBrazilianPlate(text);
    if (plate.length === 7) { await worker.terminate(); return plate; }
    results.push(plate);
  }

  await worker.terminate();
  // Retorna o resultado mais longo encontrado
  return results.sort((a, b) => b.length - a.length)[0] ?? "";
}

function captureFrame(
  video: HTMLVideoElement,
  previewCanvas: HTMLCanvasElement,
  ocrCanvas: HTMLCanvasElement
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Preview: frame completo reduzido
  previewCanvas.width = Math.min(vw, 600);
  previewCanvas.height = Math.round(vh * (previewCanvas.width / vw));
  const pCtx = previewCanvas.getContext("2d")!;
  pCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);

  // OCR: apenas a faixa central, escalada e tratada
  const cropX = vw * 0.02;
  const cropY = vh * 0.36;
  const cropW = vw * 0.96;
  const cropH = vh * 0.28;

  ocrCanvas.width = 1200;
  ocrCanvas.height = Math.round(cropH * (1200 / cropW));
  const oCtx = ocrCanvas.getContext("2d")!;
  oCtx.fillStyle = "#fff";
  oCtx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);
  oCtx.filter = "grayscale(1) contrast(2) brightness(1.15)";
  oCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, ocrCanvas.width, ocrCanvas.height);
}

export function PlateScanner({ onPlateDetected }: PlateScannerProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"camera" | "processing" | "confirm" | "error">("camera");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [plateValue, setPlateValue] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const ocrCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function close() {
    stopCamera();
    setOpen(false);
    setPhase("camera");
    setPreviewUrl("");
    setPlateValue("");
    setErrorMsg("");
  }

  async function startCamera() {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e: any) {
      const msg = e?.message || "";
      setErrorMsg(
        msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission")
          ? "Permissão de câmera negada. Permita nas configurações do navegador."
          : `Erro ao abrir câmera: ${msg}`
      );
      setPhase("error");
    }
  }

  async function capture() {
    const video = videoRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ocrCanvas = ocrCanvasRef.current;
    if (!video || !previewCanvas || !ocrCanvas || video.readyState < 2) return;

    captureFrame(video, previewCanvas, ocrCanvas);
    setPreviewUrl(previewCanvas.toDataURL("image/jpeg", 0.85));
    setPhase("processing");
    stopCamera();

    try {
      const plate = await runOCR(ocrCanvas);
      setPlateValue(plate.slice(0, 8));
    } catch {
      setPlateValue("");
    }
    setPhase("confirm");
  }

  function confirm() {
    const val = plateValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (val) onPlateDetected(val);
    close();
  }

  function retake() {
    setPhase("camera");
    setPreviewUrl("");
    setPlateValue("");
    startCamera();
  }

  useEffect(() => {
    if (open) startCamera();
    return () => { if (!open) stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopCamera(), []);

  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} title="Fotografar placa">
        <Camera className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 shrink-0">
            <p className="text-white font-medium text-sm">
              {phase === "camera" && "Enquadre a placa e capture"}
              {phase === "processing" && "Lendo placa..."}
              {phase === "confirm" && "Confirme a placa"}
              {phase === "error" && "Erro"}
            </p>
            <Button variant="ghost" size="icon" onClick={close} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 relative overflow-hidden bg-black flex flex-col items-center justify-center">

            {/* FASE: câmera ao vivo */}
            {phase === "camera" && (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline muted autoPlay
                />
                {/* Guia */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="relative w-[88%] h-[22%] z-10 border-2 border-white/60 rounded">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400" />
                  </div>
                  <p className="absolute bottom-[34%] text-white/80 text-xs z-10">
                    Centralize a placa no guia
                  </p>
                </div>
                {/* Botão capturar */}
                <button
                  onClick={capture}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-yellow-400 shadow-xl active:scale-95 transition-transform z-20"
                  aria-label="Capturar"
                />
              </>
            )}

            {/* FASE: processando */}
            {phase === "processing" && (
              <div className="flex flex-col items-center gap-4 text-white">
                {previewUrl && (
                  <img src={previewUrl} alt="Captura" className="max-w-[90%] max-h-48 rounded-lg opacity-60" />
                )}
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm text-white/70">Lendo placa com OCR...</p>
              </div>
            )}

            {/* FASE: confirmar */}
            {phase === "confirm" && (
              <div className="w-full max-w-sm mx-auto px-6 space-y-4">
                {previewUrl && (
                  <img src={previewUrl} alt="Captura" className="w-full rounded-lg" />
                )}
                <div className="bg-white rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {plateValue ? "Placa lida — confirme ou corrija:" : "OCR não detectou — digite a placa:"}
                    </p>
                    <Input
                      value={plateValue}
                      onChange={(e) => setPlateValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                      className="text-2xl font-bold font-mono tracking-widest text-center h-14"
                      placeholder="ABC1D23"
                      maxLength={8}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={retake}>
                      <Camera className="w-4 h-4 mr-1" /> Refoto
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={confirm}
                      disabled={plateValue.length < 7}
                    >
                      Usar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* FASE: erro */}
            {phase === "error" && (
              <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-3 max-w-xs">
                <p className="text-red-600 font-medium text-sm">{errorMsg}</p>
                <Button variant="outline" className="w-full" onClick={close}>Fechar</Button>
              </div>
            )}
          </div>

          <canvas ref={previewCanvasRef} className="hidden" />
          <canvas ref={ocrCanvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}
