"use client";
import { useRef, useState, useCallback, useEffect } from "react";
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

function cropAndEnhance(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  // Crop a faixa horizontal central (onde fica a placa)
  const cropX = vw * 0.05;
  const cropY = vh * 0.35;
  const cropW = vw * 0.90;
  const cropH = vh * 0.30;

  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d")!;

  // Desenha o recorte
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Aumenta contraste via filter (melhora OCR)
  const imgData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // Binariza
    const val = avg > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
}

export function PlateScanner({ onPlateDetected }: PlateScannerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"init" | "scanning" | "found" | "error">("init");
  const [detected, setDetected] = useState("");
  const [initMsg, setInitMsg] = useState("Iniciando câmera...");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<any>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const stopAll = useCallback(() => {
    activeRef.current = false;
    if (loopRef.current) clearTimeout(loopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    stopAll();
    setOpen(false);
    setStatus("init");
    setDetected("");
    setInitMsg("Iniciando câmera...");
  }, [stopAll]);

  const scanFrame = useCallback(async () => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const worker = workerRef.current;
    if (!video || !canvas || !worker || video.readyState < 2) {
      loopRef.current = setTimeout(scanFrame, 800);
      return;
    }

    try {
      cropAndEnhance(video, canvas);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
      const { data: { text } } = await worker.recognize(blob);
      const plate = extractBrazilianPlate(text);
      if (plate && activeRef.current) {
        setDetected(plate);
        setStatus("found");
        return; // para o loop, aguarda confirmação
      }
    } catch { /* ignora frames com erro */ }

    if (activeRef.current) {
      loopRef.current = setTimeout(scanFrame, 1200);
    }
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setInitMsg("Iniciando câmera...");

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Câmera não suportada neste navegador.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setInitMsg("Carregando OCR...");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        workerBlobURL: false,
        logger: () => {},
      });
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "7" as any,
      });
      workerRef.current = worker;

      activeRef.current = true;
      setStatus("scanning");
      scanFrame();
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setInitMsg("Permissão de câmera negada. Permita o acesso nas configurações do navegador.");
      } else if (msg.toLowerCase().includes("not supported") || msg.toLowerCase().includes("suportada")) {
        setInitMsg(msg);
      } else {
        setInitMsg(`Erro: ${msg}`);
      }
      setStatus("error");
    }
  }, [scanFrame]);

  useEffect(() => {
    if (open) startScanning();
    return () => { if (!open) stopAll(); };
  }, [open, startScanning, stopAll]);

  function confirm() {
    onPlateDetected(detected);
    close();
  }

  function retry() {
    setDetected("");
    setStatus("scanning");
    activeRef.current = true;
    loopRef.current = setTimeout(scanFrame, 500);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Escanear placa com câmera"
      >
        <Camera className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/80">
            <p className="text-white font-medium text-sm">
              {status === "init" && initMsg}
              {status === "scanning" && "Aponte para a placa..."}
              {status === "found" && "Placa detectada!"}
              {status === "error" && initMsg}
            </p>
            <Button variant="ghost" size="icon" onClick={close} className="text-white hover:text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Câmera */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Guia: retângulo central onde deve ficar a placa */}
            {status === "scanning" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-[28%] border-2 border-white/80 rounded-lg relative">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-yellow-400 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-yellow-400 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-yellow-400 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-yellow-400 rounded-br" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                  </div>
                </div>
                <p className="absolute bottom-[30%] text-white/70 text-xs mt-2">
                  Centralize a placa no guia
                </p>
              </div>
            )}

            {/* Resultado */}
            {status === "found" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-4 shadow-2xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Placa detectada</p>
                    <p className="text-4xl font-bold font-mono tracking-widest text-gray-900">{detected}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={retry}>
                      Reler
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={confirm}>
                      Usar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="bg-white rounded-2xl p-6 mx-6 text-center space-y-3">
                  <p className="text-red-600 font-medium">{initMsg}</p>
                  <Button variant="outline" className="w-full" onClick={close}>Fechar</Button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas oculto para processamento */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}
