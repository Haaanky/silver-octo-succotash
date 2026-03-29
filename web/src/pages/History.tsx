import { useState, useEffect } from 'react'
import type { StockTransaction, Product } from '../types'
import { getAll as getTransactions } from '../services/transactions'
import { getAll as getProducts } from '../services/products'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function History() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    Promise.all([getTransactions(), getProducts()])
      .then(([txs, prods]) => {
        setTransactions(txs)
        setProducts(new Map(prods.map(p => [p.id, p])))
      })
      .finally(() => setLoading(false))
  }, [user, navigate])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('sv-SE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historik</h1>
        <p className="text-sm text-slate-500 mt-1">{transactions.length} transaktioner totalt</p>
      </div>

      <div className="card overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-900 font-medium">Ingen historik ännu</p>
            <p className="text-slate-500 text-sm mt-1">
              Transaktioner visas här efter att du skannat och registrerat leveranser
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Tidpunkt</th>
                  <th className="table-header">Produkt</th>
                  <th className="table-header">Typ</th>
                  <th className="table-header text-right">Antal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => {
                  const product = products.get(tx.product_id)
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell text-slate-500 text-xs font-mono whitespace-nowrap">
                        {formatDate(tx.timestamp)}
                      </td>
                      <td className="table-cell font-medium text-slate-900">
                        {product?.name ?? <span className="text-slate-400 italic">Borttagen produkt</span>}
                      </td>
                      <td className="table-cell">
                        {tx.type === 'in' ? (
                          <span className="badge-green">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            Inleverans
                          </span>
                        ) : (
                          <span className="badge-red">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            Utleverans
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <span className={`font-semibold ${tx.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'in' ? '+' : '−'}{tx.quantity}
                        </span>
                        {product && (
                          <span className="text-slate-400 text-xs ml-1">{product.unit}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
