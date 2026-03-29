export interface User {
  id: string
  email: string
  role: 'admin' | 'worker'
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  unit: string
  min_stock: number
  current_stock: number
  created_at?: string
}

export interface StockTransaction {
  id: string
  product_id: string
  type: 'in' | 'out'
  quantity: number
  timestamp: string
  user_id: string
}
