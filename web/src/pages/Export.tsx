import { useState } from 'react'
import { generateCsv, generateJson, downloadFile } from '../services/exportService'

type Toast = { id: number; message: string; type: 'success' | 'info' }

export default function Export() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const handleCsv = () => {
    const csv = generateCsv()
    downloadFile('lager-export.csv', csv, 'text/csv;charset=utf-8;')
    addToast('CSV-fil nedladdad!')
  }

  const handleJson = () => {
    const json = generateJson()
    downloadFile('lager-export.json', json, 'application/json')
    addToast('JSON-fil nedladdad!')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportera data</h1>
        <p className="text-sm text-slate-500 mt-1">Ladda ner lagerdata i olika format</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* CSV */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">CSV-export</h2>
              <p className="text-xs text-slate-500">Produkttabell, kommaavgränsad</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Exporterar alla produkter med aktuellt lagersaldo. Fungerar i Excel och Google Sheets.
          </p>
          <button onClick={handleCsv} className="btn-success w-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Ladda ner CSV
          </button>
        </div>

        {/* JSON */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">JSON-export</h2>
              <p className="text-xs text-slate-500">Produkter + transaktionshistorik</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Fullständig export av produkter och alla transaktioner. Lämplig för backup och systemintegration.
          </p>
          <button onClick={handleJson} className="btn-primary w-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Ladda ner JSON
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="card p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-slate-600">
          All data lagras lokalt i din webbläsare. Exportera regelbundet för att säkerhetskopiera din lagerdata.
          Data delas med Blazor-versionen av appen via samma localStorage.
        </p>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 space-y-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
