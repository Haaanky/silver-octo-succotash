import type { StockTransaction } from '../types'
import { getItem, setItem } from './storage'
import { getById, save } from './products'

const TRANSACTIONS_KEY = 'lager_transactions'

export function getAll(): StockTransaction[] {
  const txs = getItem<StockTransaction[]>(TRANSACTIONS_KEY) ?? []
  return [...txs].sort((a, b) => b.Timestamp.localeCompare(a.Timestamp))
}

export function getByProduct(productId: string): StockTransaction[] {
  return getAll().filter(t => t.ProductId === productId)
}

export function register(
  productId: string,
  type: 'in' | 'out',
  quantity: number,
  userId: string
): void {
  const product = getById(productId)
  if (!product) throw new Error('Product not found')

  const tx: StockTransaction = {
    Id: crypto.randomUUID(),
    ProductId: productId,
    Type: type,
    Quantity: quantity,
    Timestamp: new Date().toISOString(),
    UserId: userId,
  }

  if (type === 'in') {
    product.CurrentStock += quantity
  } else {
    product.CurrentStock = Math.max(0, product.CurrentStock - quantity)
  }

  save(product)

  const txs = getItem<StockTransaction[]>(TRANSACTIONS_KEY) ?? []
  txs.push(tx)
  setItem(TRANSACTIONS_KEY, txs)
}
