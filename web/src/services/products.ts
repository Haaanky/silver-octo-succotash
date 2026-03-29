import type { Product } from '../types'
import { getItem, setItem } from './storage'

const PRODUCTS_KEY = 'lager_products'

export function getAll(): Product[] {
  return getItem<Product[]>(PRODUCTS_KEY) ?? []
}

export function getById(id: string): Product | undefined {
  return getAll().find(p => p.Id === id)
}

export function getByBarcode(barcode: string): Product | undefined {
  return getAll().find(
    p => p.Barcode === barcode || p.Sku.toLowerCase() === barcode.toLowerCase()
  )
}

export function save(product: Product): void {
  const products = getAll()
  const idx = products.findIndex(p => p.Id === product.Id)
  if (idx >= 0) {
    products[idx] = product
  } else {
    products.push(product)
  }
  setItem(PRODUCTS_KEY, products)
}

export function remove(id: string): void {
  setItem(PRODUCTS_KEY, getAll().filter(p => p.Id !== id))
}
