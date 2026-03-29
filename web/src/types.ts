// These interfaces match the C# models with PascalCase keys (System.Text.Json default)
// so localStorage data is shared between the Blazor and React versions.

export interface User {
  Id: string
  Email: string
  Role: string
  PasswordHash: string
}

export interface Product {
  Id: string
  Name: string
  Sku: string
  Barcode: string
  Unit: string
  MinStock: number
  CurrentStock: number
}

export interface StockTransaction {
  Id: string
  ProductId: string
  Type: 'in' | 'out'
  Quantity: number
  Timestamp: string
  UserId: string
}
