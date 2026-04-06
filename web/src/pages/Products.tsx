import { useState, useEffect, useRef } from 'react'
import type { Product } from '../types'
import { getAll, save, remove } from '../services/products'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductScannerModal from '../components/ProductScannerModal'

const emptyForm = (): Omit<Product, 'id' | 'created_at'> => ({
  name: '',
  sku: '',
  barcode: '',
  unit: 'st',
  min_stock: 0,
  current_stock: 0,
})

type ScanTarget = 'barcode' | 'text-name' | 'text-sku'

function ScanButton({
  target,
  mode,
  onScan,
}: {
  target: ScanTarget
  mode: 'barcode' | 'text'
  onScan: (target: ScanTarget) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onScan(target)}
      title={mode === 'barcode' ? 'Skanna streckkod' : 'Skanna text från kamera'}
      aria-label={mode === 'barcode' ? 'Skanna streckkod' : 'Skanna text från kamera'}
      className="shrink-0 p-2 rounded-lg border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors"
    >
      {mode === 'barcode' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 9V6a3 3 0 013-3h2M3 15v3a3 3 0 003 3h2m10-18h2a3 3 0 013 3v3m0 6v3a3 3 0 01-3 3h-2M9 9h6v6H9z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  )
}

export default function Products() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null)
  const [scanFlash, setScanFlash] = useState<keyof typeof form | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current) }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    getAll().then(setProducts)
  }, [user, navigate])

  const refresh = () => getAll().then(setProducts)

  const handleEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unit: product.unit,
      min_stock: product.min_stock,
      current_stock: product.current_stock,
    })
    setShowForm(true)
    setError('')
  }

  const handleNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setShowForm(true)
    setError('')
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm())
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Namn är obligatoriskt')
      return
    }
    setSaving(true)
    try {
      await save({ ...form, id: editing?.id })
      await refresh()
      handleCancel()
    } catch {
      setError('Kunde inte spara produkten. Försök igen.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort produkten?')) return
    await remove(id)
    await refresh()
  }

  const flashField = (key: keyof typeof form) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setScanFlash(key)
    flashTimerRef.current = setTimeout(() => setScanFlash(null), 1200)
  }

  const handleBarcodeScanned = (code: string) => {
    setScanTarget(null)
    setForm(f => ({ ...f, barcode: code }))
    flashField('barcode')
  }

  const handleTextScanned = (text: string) => {
    if (scanTarget === 'text-name') {
      setScanTarget(null)
      setForm(f => ({ ...f, name: text }))
      flashField('name')
    } else if (scanTarget === 'text-sku') {
      setScanTarget(null)
      setForm(f => ({ ...f, sku: text }))
      flashField('sku')
    }
  }

  return (
    <div className="space-y-6">
      {scanTarget && (
        <ProductScannerModal
          initialMode={scanTarget === 'barcode' ? 'barcode' : 'text'}
          onBarcode={handleBarcodeScanned}
          onTextLine={handleTextScanned}
          onClose={() => setScanTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produkter</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} produkter</p>
        </div>
        {!showForm && (
          <button onClick={handleNew} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ny produkt
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            {editing ? 'Redigera produkt' : 'Ny produkt'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name field with OCR scan button */}
              <div>
                <label className="label">Namn *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`input flex-1 transition-colors ${scanFlash === 'name' ? 'border-indigo-500 bg-indigo-50' : ''}`}
                    placeholder="Produktnamn"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <ScanButton target="text-name" mode="text" onScan={setScanTarget} />
                </div>
              </div>

              {/* SKU field with OCR scan button */}
              <div>
                <label className="label">SKU</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`input flex-1 transition-colors ${scanFlash === 'sku' ? 'border-indigo-500 bg-indigo-50' : ''}`}
                    placeholder="Artikelnummer"
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  />
                  <ScanButton target="text-sku" mode="text" onScan={setScanTarget} />
                </div>
              </div>

              {/* Barcode field with barcode scanner button */}
              <div>
                <label className="label">Streckkod</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`input flex-1 transition-colors ${scanFlash === 'barcode' ? 'border-indigo-500 bg-indigo-50' : ''}`}
                    placeholder="EAN/QR-kod"
                    value={form.barcode}
                    onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  />
                  <ScanButton target="barcode" mode="barcode" onScan={setScanTarget} />
                </div>
              </div>

              {/* Unit field (no scan) */}
              <div>
                <label className="label">Enhet</label>
                <input
                  type="text"
                  className="input"
                  placeholder="st, kg, l..."
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                />
              </div>

              {/* Min stock */}
              <div>
                <label className="label">Minimilager</label>
                <input
                  type="number"
                  className="input"
                  value={form.min_stock}
                  onChange={e => setForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Start stock (only when creating) */}
              {!editing && (
                <div>
                  <label className="label">Startlager</label>
                  <input
                    type="number"
                    className="input"
                    value={form.current_stock}
                    onChange={e => setForm(f => ({ ...f, current_stock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Avbryt
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Sparar...' : editing ? 'Spara ändringar' : 'Skapa produkt'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="font-medium">Inga produkter ännu</p>
            <p className="text-sm mt-1">Klicka "Ny produkt" för att lägga till din första produkt</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Namn</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Streckkod</th>
                  <th className="table-header">Enhet</th>
                  <th className="table-header text-right">Min</th>
                  <th className="table-header text-right">Saldo</th>
                  <th className="table-header text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-medium text-slate-900">{product.name}</td>
                    <td className="table-cell text-slate-500 font-mono text-xs">{product.sku || '—'}</td>
                    <td className="table-cell text-slate-500 font-mono text-xs">{product.barcode || '—'}</td>
                    <td className="table-cell text-slate-500">{product.unit}</td>
                    <td className="table-cell text-right text-slate-500">{product.min_stock}</td>
                    <td className="table-cell text-right font-semibold">
                      <span className={product.current_stock <= product.min_stock ? 'text-amber-600' : 'text-slate-900'}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Ta bort
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
