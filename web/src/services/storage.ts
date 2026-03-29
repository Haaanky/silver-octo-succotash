export function getItem<T>(key: string): T | null {
  const json = localStorage.getItem(key)
  if (!json) return null
  return JSON.parse(json) as T
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key: string): void {
  localStorage.removeItem(key)
}
