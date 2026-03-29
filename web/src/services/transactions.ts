import { supabase } from '../lib/supabase'
import type { StockTransaction } from '../types'

export async function getAll(): Promise<StockTransaction[]> {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('*')
    .order('timestamp', { ascending: false })
  if (error) throw error
  return data
}

export async function register(
  productId: string,
  type: 'in' | 'out',
  quantity: number,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('stock_transactions').insert({
    product_id: productId,
    type,
    quantity,
    user_id: userId,
    timestamp: new Date().toISOString(),
  })
  if (error) throw error
}
