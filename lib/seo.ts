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

export const POSTAL_CODES: Record<string, string> = {
  'Amazonas': '01001', 'Ancash': '02001', 'Apurimac': '03001',
  'Arequipa': '04001', 'Ayacucho': '05001', 'Cajamarca': '06001',
  'Callao': '07001', 'Cusco': '08001', 'Huancavelica': '09001',
  'Huanuco': '10001', 'Ica': '11001', 'Junin': '12001',
  'La Libertad': '13001', 'Lambayeque': '14001', 'Lima': '15001',
  'Loreto': '16001', 'Madre De Dios': '17001', 'Moquegua': '18001',
  'Pasco': '19001', 'Piura': '20001', 'Puno': '21001',
  'San Martin': '22001', 'Tacna': '23001', 'Tumbes': '24001',
  'Ucayali': '25001',
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
