import { cookies as nextCookies } from 'next/headers'

export async function getCookie(name: string) {
  const cookieStore = await nextCookies()
  return cookieStore.get(name)?.value
}

export async function setCookie(name: string, value: string, options?: {
  path?: string
  maxAge?: number
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
}) {
  const cookieStore = await nextCookies()
  cookieStore.set({ name, value, ...options })
}

export async function deleteCookie(name: string) {
  const cookieStore = await nextCookies()
  cookieStore.set({ name, value: '', maxAge: 0 })
}
