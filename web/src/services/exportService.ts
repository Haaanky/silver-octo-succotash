import { getAll as getProducts } from './products'
import { getAll as getTransactions } from './transactions'

function escapeCsv(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function generateCsv(): Promise<string> {
  const products = await getProducts()
  const header = 'id,name,sku,barcode,unit,min_stock,current_stock'
  const rows = products.map(p =>
    [p.id, p.name, p.sku, p.barcode, p.unit, p.min_stock, p.current_stock]
      .map(escapeCsv)
      .join(',')
  )
  return [header, ...rows].join('\n')
}

export async function generateJson(): Promise<string> {
  const [products, transactions] = await Promise.all([getProducts(), getTransactions()])
  return JSON.stringify({ products, transactions }, null, 2)
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
