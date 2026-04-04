import { useState, useRef, useEffect, useCallback } from 'react'

type ScanMode = 'barcode' | 'text'

interface Props {
  initialMode?: ScanMode
  onBarcode: (code: string) => void
  onTextLine: (text: string) => void
  onClose: () => void
}

export default function ProductScannerModal({ initialMode = 'barcode', onBarcode, onTextLine, onClose }: Props) {
  const [mode, setMode] = useState<ScanMode>(initialMode)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [ocrLines, setOcrLines] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    zxingControlsRef.current?.stop()
    zxingControlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const handleBarcodeFound = useCallback((code: string) => {
    stopCamera()
    onBarcode(code)
  }, [stopCamera, onBarcode])

  const startCamera = async (newMode: ScanMode) => {
    setCameraError('')
    setScanning(true)
    setOcrLines([])
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
    } catch {
      setCameraError('Kunde inte komma åt kameran.')
      setScanning(false)
      return
    }
    // Guard: if modal was closed while permission prompt was open, stop immediately
    if (!streamRef.current && !videoRef.current) {
      stream.getTracks().forEach(t => t.stop())
      return
    }
    streamRef.current = stream
    try {

      if (newMode === 'barcode') {
        if ('BarcodeDetector' in window) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            await videoRef.current.play()
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector()
          const detect = async () => {
            if (!videoRef.current || !streamRef.current) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes.length > 0) {
                handleBarcodeFound(codes[0].rawValue as string)
                return
              }
            } catch {
              // continue scanning
            }
            rafRef.current = requestAnimationFrame(detect)
          }
          rafRef.current = requestAnimationFrame(detect)
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()
          if (!videoRef.current) {
            setCameraError('Kunde inte komma åt kameran. Ange streckkoden manuellt.')
            setScanning(false)
            return
          }
          const controls = await reader.decodeFromStream(stream, videoRef.current, result => {
            if (result) {
              zxingControlsRef.current?.stop()
              zxingControlsRef.current = null
              handleBarcodeFound(result.getText())
            }
          })
          zxingControlsRef.current = controls
        }
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      }
    } catch {
      setCameraError('Kunde inte komma åt kameran.')
      setScanning(false)
    }
  }

  const captureAndOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setProcessing(true)
    setOcrLines([])
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(canvas)
      await worker.terminate()
      const lines = data.text
        .split('\n')
        .map((l: string) => l.trim())
        .filter((t: string) => t.length > 1)
      setOcrLines(lines)
      if (lines.length === 0) {
        setCameraError('Ingen text hittades. Försök hålla kameran stilla och nära texten.')
      }
    } catch {
      setCameraError('Kunde inte extrahera text. Försök igen.')
    } finally {
      setProcessing(false)
    }
  }

  const switchMode = (newMode: ScanMode) => {
    const wasScanning = scanning
    stopCamera()
    setScanning(false)
    setOcrLines([])
    setCameraError('')
    setMode(newMode)
    if (wasScanning) startCamera(newMode)
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex gap-1 p-1 bg-white/10 rounded-xl">
          <button
            onClick={() => mode !== 'barcode' && switchMode('barcode')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'barcode' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
            }`}
          >
            Streckkod
          </button>
          <button
            onClick={() => mode !== 'text' && switchMode('text')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'text' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
            }`}
          >
            Skanna text
          </button>
        </div>
        <button
          onClick={handleClose}
          aria-label="Stäng scanner"
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Barcode targeting frame */}
        {mode === 'barcode' && scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 relative">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-md" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-md" />
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-indigo-400/60 animate-pulse" />
            </div>
          </div>
        )}

        {/* Text mode guide overlay */}
        {mode === 'text' && scanning && !processing && ocrLines.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-40 border-2 border-dashed border-white/40 rounded-xl flex items-center justify-center">
              <p className="text-white/60 text-sm">Rikta mot texten på förpackningen</p>
            </div>
          </div>
        )}

        {/* Start camera button */}
        {!scanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9V6a3 3 0 013-3h2M3 15v3a3 3 0 003 3h2m10-18h2a3 3 0 013 3v3m0 6v3a3 3 0 01-3 3h-2M9 9h6v6H9z" />
              </svg>
            </div>
            <button
              onClick={() => startCamera(mode)}
              className="btn bg-white text-slate-900 hover:bg-slate-100 shadow-xl px-6"
            >
              Starta kamera
            </button>
            <p className="text-white/50 text-xs">
              {mode === 'barcode'
                ? 'Rikta mot en streckkod eller QR-kod'
                : 'Ta en bild av produkttexten'}
            </p>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            {cameraError}
          </div>
        )}

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-sm">Extraherar text...</p>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="bg-slate-900 px-4 py-4 space-y-3">
        {mode === 'text' && scanning && !processing && (
          <button
            onClick={captureAndOCR}
            className="w-full btn bg-white text-slate-900 hover:bg-slate-100 py-3 text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ta bild och läs text
          </button>
        )}

        {ocrLines.length > 0 && (
          <div className="space-y-2">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Tryck på en textrad för att använda
            </p>
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
              {ocrLines.map((line, i) => (
                <button
                  key={i}
                  onClick={() => onTextLine(line)}
                  className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-sm text-white transition-colors"
                >
                  {line}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setOcrLines([]); setCameraError('') }}
              className="w-full text-center text-white/50 hover:text-white/80 text-xs py-1 transition-colors"
            >
              Skanna igen
            </button>
          </div>
        )}

        {mode === 'barcode' && scanning && (
          <p className="text-center text-white/40 text-xs py-1">
            Håll streckkoden innanför ramen
          </p>
        )}
      </div>
    </div>
  )
}
