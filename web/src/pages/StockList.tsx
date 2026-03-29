import { useState, useMemo } from 'react'
import type { Product } from '../types'
import { getAll } from '../services/products'

function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => getAll())
  const refresh = () => setProducts(getAll())
  return { products, refresh }
}

export default function StockList() {
  const { products } = useProducts()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(
      p =>
        p.Name.toLowerCase().includes(q) ||
        p.Sku.toLowerCase().includes(q) ||
        p.Barcode.toLowerCase().includes(q)
    )
  }, [products, search])

  const lowCount = products.filter(p => p.CurrentStock <= p.MinStock).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lagerlista</h1>
          <p className="text-sm text-slate-500 mt-1">
            {products.length} produkter totalt
            {lowCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {lowCount} med lågt lager
              </span>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            className="input pl-9"
            placeholder="Sök namn, SKU, streckkod..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats row */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Totalt produkter" value={products.length} />
          <StatCard
            label="OK lager"
            value={products.filter(p => p.CurrentStock > p.MinStock).length}
            color="emerald"
          />
          <StatCard
            label="Lågt lager"
            value={lowCount}
            color={lowCount > 0 ? 'amber' : 'slate'}
          />
          <StatCard
            label="Tomt lager"
            value={products.filter(p => p.CurrentStock === 0).length}
            color={products.filter(p => p.CurrentStock === 0).length > 0 ? 'red' : 'slate'}
          />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            {products.length === 0 ? (
              <EmptyState />
            ) : (
              <p className="text-slate-500">Inga produkter matchar sökningen "{search}"</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Produkt</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Streckkod</th>
                  <th className="table-header text-right">Lager</th>
                  <th className="table-header text-right">Min</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(product => (
                  <ProductRow key={product.Id} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductRow({ product }: { product: Product }) {
  const isLow = product.CurrentStock <= product.MinStock
  const isEmpty = product.CurrentStock === 0

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}>
      <td className="table-cell font-medium text-slate-900">{product.Name}</td>
      <td className="table-cell text-slate-500 font-mono text-xs">{product.Sku || '—'}</td>
      <td className="table-cell text-slate-500 font-mono text-xs">{product.Barcode || '—'}</td>
      <td className="table-cell text-right font-semibold">
        <span className={isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
          {product.CurrentStock}
        </span>
        <span className="text-slate-400 text-xs ml-1">{product.Unit}</span>
      </td>
      <td className="table-cell text-right text-slate-500">{product.MinStock}</td>
      <td className="table-cell">
        {isEmpty ? (
          <span className="badge-red">Tomt</span>
        ) : isLow ? (
          <span className="badge-amber">Lågt</span>
        ) : (
          <span className="badge-green">OK</span>
        )}
      </td>
    </tr>
  )
}

function StatCard({
  label,
  value,
  color = 'slate',
}: {
  label: string
  value: number
  color?: 'emerald' | 'amber' | 'red' | 'slate'
}) {
  const colors = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    slate: 'text-slate-900',
  }
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <div>
        <p className="text-slate-900 font-medium">Inga produkter ännu</p>
        <p className="text-slate-500 text-sm">Lägg till produkter under Produkter-sidan</p>
      </div>
    </div>
  )
}
