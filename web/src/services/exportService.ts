import { getAll as getProducts } from './products'
import { getAll as getTransactions } from './transactions'

function escapeCsv(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function generateCsv(): string {
  const products = getProducts()
  const header = 'Id,Name,Sku,Barcode,Unit,MinStock,CurrentStock'
  const rows = products.map(p =>
    [p.Id, p.Name, p.Sku, p.Barcode, p.Unit, p.MinStock, p.CurrentStock]
      .map(escapeCsv)
      .join(',')
  )
  return [header, ...rows].join('\n')
}

export function generateJson(): string {
  return JSON.stringify(
    { products: getProducts(), transactions: getTransactions() },
    null,
    2
  )
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
