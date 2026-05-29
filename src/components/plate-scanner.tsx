"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
}

function captureFrame(
  video: HTMLVideoElement,
  preview: HTMLCanvasElement,
  ocr: HTMLCanvasElement
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Preview: frame completo
  preview.width = Math.min(vw, 640);
  preview.height = Math.round(vh * (preview.width / vw));
  preview.getContext("2d")!.drawImage(video, 0, 0, preview.width, preview.height);

  // OCR: faixa central escalada para 1200px
  const cx = vw * 0.02, cy = vh * 0.30;
  const cw = vw * 0.96, ch = vh * 0.40;
  ocr.width = 1200;
  ocr.height = Math.round(ch * (1200 / cw));
  const ctx = ocr.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, ocr.width, ocr.height);
  ctx.drawImage(video, cx, cy, cw, ch, 0, 0, ocr.width, ocr.height);
}

export function PlateScanner({ onPlateDetected }: PlateScannerProps) {
  const [open, setOpen]       = useState(false);
  const [phase, setPhase]     = useState<"camera" | "processing" | "confirm" | "error">("camera");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [plateValue, setPlateValue] = useState("");
  const [score, setScore]     = useState<number | null>(null);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const ocrRef     = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

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
    setScore(null);
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
          : `Erro: ${msg}`
      );
      setPhase("error");
    }
  }

  async function capture() {
    const video = videoRef.current;
    const preview = previewRef.current;
    const ocr = ocrRef.current;
    if (!video || !preview || !ocr || video.readyState < 2) return;

    captureFrame(video, preview, ocr);
    setPreviewUrl(preview.toDataURL("image/jpeg", 0.9));
    setPhase("processing");
    stopCamera();

    try {
      const imageBase64 = ocr.toDataURL("image/jpeg", 0.92);
      const res = await fetch("/api/ocr-placa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();

      if (data.plate) {
        setPlateValue(data.plate.slice(0, 8));
        setScore(data.score ?? null);
      } else {
        setPlateValue("");
        setScore(null);
      }
    } catch {
      setPlateValue("");
      setScore(null);
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
    setScore(null);
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
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Fotografar placa"
      >
        <Camera className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 shrink-0">
            <p className="text-white font-medium text-sm">
              {phase === "camera"     && "Enquadre a placa e capture"}
              {phase === "processing" && "Lendo placa..."}
              {phase === "confirm"    && "Confirme a placa"}
              {phase === "error"      && "Erro"}
            </p>
            <Button variant="ghost" size="icon" onClick={close} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 relative overflow-hidden bg-black flex flex-col items-center justify-center">

            {/* Câmera ao vivo */}
            {phase === "camera" && (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                {/* Guia */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="relative w-[88%] h-[22%] z-10">
                    <div className="absolute -top-1 -left-1  w-6 h-6 border-t-4 border-l-4 border-yellow-400" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400" />
                    <div className="absolute -bottom-1 -left-1  w-6 h-6 border-b-4 border-l-4 border-yellow-400" />
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

            {/* Processando */}
            {phase === "processing" && (
              <div className="flex flex-col items-center gap-4 text-white">
                {previewUrl && (
                  <img src={previewUrl} alt="Captura" className="max-w-[90%] max-h-48 rounded-lg opacity-60" />
                )}
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm text-white/70">Reconhecendo placa...</p>
              </div>
            )}

            {/* Confirmar */}
            {phase === "confirm" && (
              <div className="w-full max-w-sm mx-auto px-6 space-y-4">
                {previewUrl && (
                  <img src={previewUrl} alt="Captura" className="w-full rounded-lg" />
                )}
                <div className="bg-white rounded-2xl p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-500">
                        {plateValue
                          ? "Placa lida — confirme ou corrija:"
                          : "Não reconheceu — digite a placa:"}
                      </p>
                      {score !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          score >= 0.85 ? "bg-green-100 text-green-700"
                          : score >= 0.6  ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}>
                          {Math.round(score * 100)}% confiança
                        </span>
                      )}
                    </div>
                    <Input
                      value={plateValue}
                      onChange={(e) =>
                        setPlateValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
                      }
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

            {/* Erro */}
            {phase === "error" && (
              <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-3 max-w-xs">
                <p className="text-red-600 font-medium text-sm">{errorMsg}</p>
                <Button variant="outline" className="w-full" onClick={close}>Fechar</Button>
              </div>
            )}
          </div>

          <canvas ref={previewRef} className="hidden" />
          <canvas ref={ocrRef} className="hidden" />
        </div>
      )}
    </>
  );
}
