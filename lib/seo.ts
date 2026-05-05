export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://convocape.com'

export function slugifyEntidad(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export const EMPLOYMENT_TYPE: Record<string, string> = {
  'CAS':      'CONTRACT',
  'D.L. 728': 'FULL_TIME',
  '728':      'FULL_TIME',
  'D.L. 276': 'PERMANENT',
  '276':      'PERMANENT',
}

export function formatDateISO(date: string): string {
  return new Date(date + 'T00:00:00').toISOString()
}
