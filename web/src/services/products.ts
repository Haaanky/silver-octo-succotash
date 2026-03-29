import { supabase } from '../lib/supabase'
import type { Product } from '../types'

export async function getAll(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getByBarcode(barcode: string): Promise<Product | undefined> {
  const { data: byBarcode } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()
  if (byBarcode) return byBarcode

  const { data: bySku } = await supabase
    .from('products')
    .select('*')
    .ilike('sku', barcode)
    .maybeSingle()
  return bySku ?? undefined
}

export async function save(product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> {
  if (product.id) {
    const { id, ...fields } = product
    const { data, error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
