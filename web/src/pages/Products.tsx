import { useState, useEffect } from 'react'
import type { Product } from '../types'
import { getAll, save, remove } from '../services/products'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const emptyForm = (): Omit<Product, 'id' | 'created_at'> => ({
  name: '',
  sku: '',
  barcode: '',
  unit: 'st',
  min_stock: 0,
  current_stock: 0,
})

export default function Products() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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

  const field = (
    key: keyof typeof form,
    label: string,
    type: 'text' | 'number' = 'text',
    placeholder = ''
  ) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[key]}
        onChange={e =>
          setForm(f => ({
            ...f,
            [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value,
          }))
        }
      />
    </div>
  )

  return (
    <div className="space-y-6">
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
              {field('name', 'Namn *', 'text', 'Produktnamn')}
              {field('sku', 'SKU', 'text', 'Artikelnummer')}
              {field('barcode', 'Streckkod', 'text', 'EAN/QR-kod')}
              {field('unit', 'Enhet', 'text', 'st, kg, l...')}
              {field('min_stock', 'Minimilager', 'number')}
              {!editing && field('current_stock', 'Startlager', 'number')}
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
