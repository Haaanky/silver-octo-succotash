import { useState, useRef, useEffect, useCallback } from 'react'
import type { Product } from '../types'
import { getByBarcode } from '../services/products'
import { register } from '../services/transactions'
import { useAuth } from '../context/AuthContext'

type Step = 'scan' | 'confirm' | 'done'

export default function Scan() {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('scan')
  const [manualInput, setManualInput] = useState('')
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [unknownBarcode, setUnknownBarcode] = useState('')
  const [txType, setTxType] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState(1)
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)

  const handleBarcode = useCallback(async (code: string) => {
    setScanning(false)
    stopCamera()
    const product = await getByBarcode(code)
    if (product) {
      setFoundProduct(product)
      setUnknownBarcode('')
      setStep('confirm')
    } else {
      setUnknownBarcode(code)
      setFoundProduct(null)
    }
  }, [])

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    zxingControlsRef.current?.stop()
    zxingControlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setCameraError('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream

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
              handleBarcode(codes[0].rawValue as string)
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
        const controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (result) {
            zxingControlsRef.current?.stop()
            zxingControlsRef.current = null
            handleBarcode(result.getText())
          }
        })
        zxingControlsRef.current = controls
      }
    } catch {
      setCameraError('Kunde inte komma åt kameran. Ange streckkoden manuellt.')
      setScanning(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      handleBarcode(manualInput.trim())
      setManualInput('')
    }
  }

  const handleConfirm = async () => {
    if (!foundProduct || !user) return
    setRegistering(true)
    setRegisterError('')
    try {
      await register(foundProduct.id, txType, quantity, user.id)
      setStep('done')
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : 'Okänt fel vid registrering')
    } finally {
      setRegistering(false)
    }
  }

  const reset = () => {
    setStep('scan')
    setFoundProduct(null)
    setUnknownBarcode('')
    setQuantity(1)
    setTxType('in')
    setCameraError('')
    setRegisterError('')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Skanna</h1>
        <p className="text-sm text-slate-500 mt-1">Registrera in- och utleveranser</p>
      </div>

      <div className="flex items-center gap-2">
        {(['scan', 'confirm', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              step === s ? 'bg-indigo-600 text-white' :
              (step === 'confirm' && i === 0) || step === 'done' ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-400'
            }`}>
              {((step === 'confirm' && i === 0) || step === 'done') ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 'scan' ? 'Skanna' : s === 'confirm' ? 'Bekräfta' : 'Klar'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {step === 'scan' && (
        <div className="card p-6 space-y-4">
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 9V6a3 3 0 013-3h2M3 15v3a3 3 0 003 3h2m10-18h2a3 3 0 013 3v3m0 6v3a3 3 0 01-3 3h-2M9 9h6v6H9z" />
                  </svg>
                </div>
                <button onClick={startCamera} className="btn bg-white text-slate-900 hover:bg-slate-100 shadow-lg">
                  Starta kamera
                </button>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/60 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              {cameraError}
            </div>
          )}

          {unknownBarcode && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              Okänd streckkod: <strong>{unknownBarcode}</strong>. Ingen produkt hittades.
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Eller ange manuellt:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Streckkod eller SKU"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
              />
              <button type="submit" className="btn-primary shrink-0">Sök</button>
            </form>
          </div>
        </div>
      )}

      {step === 'confirm' && foundProduct && (
        <div className="card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Produkt hittad</p>
              <p className="text-lg font-semibold text-slate-900">{foundProduct.name}</p>
              <p className="text-sm text-slate-500">
                Nuvarande saldo: <strong>{foundProduct.current_stock} {foundProduct.unit}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Typ</label>
              <select className="input" value={txType} onChange={e => setTxType(e.target.value as 'in' | 'out')}>
                <option value="in">Inleverans (+)</option>
                <option value="out">Utleverans (−)</option>
              </select>
            </div>
            <div>
              <label className="label">Antal</label>
              <input
                type="number"
                className="input"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            Nytt saldo efter registrering:{' '}
            <strong className="text-slate-900">
              {txType === 'in'
                ? foundProduct.current_stock + quantity
                : Math.max(0, foundProduct.current_stock - quantity)}{' '}
              {foundProduct.unit}
            </strong>
          </div>

          {registerError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              {registerError}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={reset}>Avbryt</button>
            <button className="btn-success flex-1" onClick={handleConfirm} disabled={registering}>
              {registering ? 'Registrerar...' : 'Registrera'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">Registrerad!</p>
            <p className="text-slate-500 text-sm mt-1">
              {txType === 'in' ? 'Inleverans' : 'Utleverans'} av {quantity} {foundProduct?.unit} registrerad
              för <strong>{foundProduct?.name}</strong>
            </p>
          </div>
          <button className="btn-primary" onClick={reset}>Skanna mer</button>
        </div>
      )}
    </div>
  )
}
