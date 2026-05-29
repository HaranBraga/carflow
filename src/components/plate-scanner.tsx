"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
}

function extractBrazilianPlate(text: string): string | null {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const mercosul = clean.match(/[A-Z]{3}[0-9][A-Z][0-9]{2}/);
  if (mercosul) return mercosul[0];
  const old = clean.match(/[A-Z]{3}[0-9]{4}/);
  if (old) return old[0];
  return null;
}

export function PlateScanner({ onPlateDetected }: PlateScannerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"init" | "scanning" | "found" | "error">("init");
  const [initMsg, setInitMsg] = useState("Iniciando câmera...");
  const [detected, setDetected] = useState("");
  const [attempts, setAttempts] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const attemptsRef = useRef(0);

  function stopAll() {
    activeRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (workerRef.current) { workerRef.current.terminate().catch(() => {}); workerRef.current = null; }
  }

  function close() {
    stopAll();
    setOpen(false);
    setStatus("init");
    setDetected("");
    setAttempts(0);
    attemptsRef.current = 0;
  }

  function scheduleNext() {
    if (!activeRef.current) return;
    timerRef.current = setTimeout(doScan, 1500);
  }

  async function doScan() {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const worker = workerRef.current;

    if (!video || !canvas || !worker || video.readyState < 3) {
      scheduleNext();
      return;
    }

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      // Recorte central — onde fica a placa na visão do guia
      const cx = vw * 0.05;
      const cy = vh * 0.38;
      const cw = vw * 0.90;
      const ch = vh * 0.24;

      // Canvas em tamanho fixo para OCR (largura ideal ~800px)
      const scale = 800 / cw;
      canvas.width = 800;
      canvas.height = Math.round(ch * scale);

      const ctx = canvas.getContext("2d")!;
      // Fundo branco
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Contraste aumentado via filter
      ctx.filter = "contrast(1.8) brightness(1.1) grayscale(1)";
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";

      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/png")
      );

      const { data: { text } } = await worker.recognize(blob);
      const plate = extractBrazilianPlate(text);

      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      if (plate && activeRef.current) {
        setDetected(plate);
        setStatus("found");
        return;
      }
    } catch { /* frame ruim — tenta novamente */ }

    scheduleNext();
  }

  async function startScanning() {
    try {
      setInitMsg("Iniciando câmera...");

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Câmera não suportada neste navegador.");
      }

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

      setInitMsg("Carregando OCR...");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: () => {} });
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "8" as any, // PSM 8 = trata como palavra única (ideal p/ placa)
      });
      workerRef.current = worker;

      activeRef.current = true;
      attemptsRef.current = 0;
      setAttempts(0);
      setStatus("scanning");
      timerRef.current = setTimeout(doScan, 1000);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setInitMsg(
        msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
          ? "Permissão de câmera negada. Permita nas configurações do navegador."
          : msg.toLowerCase().includes("suportada")
          ? msg
          : `Erro: ${msg}`
      );
      setStatus("error");
    }
  }

  function retry() {
    setDetected("");
    attemptsRef.current = 0;
    setAttempts(0);
    setStatus("scanning");
    activeRef.current = true;
    timerRef.current = setTimeout(doScan, 300);
  }

  function confirm() {
    onPlateDetected(detected);
    close();
  }

  useEffect(() => {
    if (open) startScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopAll(), []);

  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} title="Escanear placa">
        <Camera className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
            <div>
              <p className="text-white font-medium text-sm">
                {status === "init" && initMsg}
                {status === "scanning" && "Aponte para a placa..."}
                {status === "found" && "Placa detectada!"}
                {status === "error" && initMsg}
              </p>
              {status === "scanning" && attempts > 0 && (
                <p className="text-white/50 text-xs mt-0.5">
                  {attempts} tentativa{attempts > 1 ? "s" : ""}
                  {attempts >= 8 ? " — centralize a placa no guia" : ""}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={close} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Vídeo */}
          <div className="flex-1 relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Guia */}
            {status === "scanning" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Escurecimento lateral */}
                <div className="absolute inset-0 bg-black/40" />
                {/* Janela transparente */}
                <div className="relative w-[88%] h-[22%] z-10">
                  <div className="absolute inset-0 bg-transparent border-0" />
                  {/* Cantos */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-sm" />
                  {/* Linha de scan animada */}
                  <div className="absolute inset-x-0 h-0.5 bg-yellow-400/70 animate-pulse top-1/2" />
                </div>
                <p className="absolute bottom-[36%] text-white/80 text-xs z-10">
                  Centralize a placa dentro do guia
                </p>
              </div>
            )}

            {/* Resultado */}
            {status === "found" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-4 shadow-2xl w-full max-w-xs">
                  <p className="text-sm text-gray-500">Placa detectada</p>
                  <p className="text-4xl font-bold font-mono tracking-widest text-gray-900">{detected}</p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={retry}>Reler</Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirm}>Usar</Button>
                  </div>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-3 max-w-xs">
                  <p className="text-red-600 font-medium text-sm">{initMsg}</p>
                  <Button variant="outline" className="w-full" onClick={close}>Fechar</Button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}
