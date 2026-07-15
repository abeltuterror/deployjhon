// Fechas de los anuncios del Poder Judicial (PSEP): el texto escrito de cada
// etapa (fechaTexto) es la fuente más confiable — el extractor lo copia verbatim
// del PDF. Sus fechaIni/fechaFin ISO en cambio a veces vienen mal parseadas
// (p.ej. toma el "26" del año "2026" como día e invierte rangos "Del X al Y").
// Compartido por el Gantt (render) y el Route Handler (integridad al insertar).

export function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, setiembre: 8, septiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
}

// "Del 09 de Julio del 2026 al 22 de Julio del 2026" → 09/07–22/07.
// "21 y 22 de Julio del 2026" → 21/07–22/07. "No aplica" → null.
// Recorre los tokens: los números de 1–2 cifras son días en espera, un mes
// los consume, y el año (4 cifras) aplica a todo el texto.
export function parseFechaTexto(texto: string | null): { ini: number; fin: number } | null {
  if (!texto) return null
  const tokens = normalizarTexto(texto).match(/\d+|[a-z]+/g) ?? []
  const diasEnEspera: number[] = []
  const fechas: { dia: number; mes: number }[] = []
  let anio: number | null = null

  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      const n = Number(t)
      if (t.length === 4) anio = n
      else if (n >= 1 && n <= 31) diasEnEspera.push(n)
    } else if (t in MESES) {
      fechas.push(...diasEnEspera.splice(0).map(dia => ({ dia, mes: MESES[t] })))
    }
  }
  if (fechas.length === 0 || anio === null) return null

  const ms = fechas.map(f => new Date(anio as number, f.mes, f.dia).getTime())
  return { ini: Math.min(...ms), fin: Math.max(...ms) }
}

// 'YYYY-MM-DD…' → ms a medianoche local (evita desfase de zona horaria de new Date(string))
export function parseFechaISO(s: string | null): number | null {
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null
}

// Rango de fechas de una etapa: el texto escrito manda; ISO solo como respaldo
export function rangoFechas(
  fechaTexto: string | null,
  fechaIni: string | null,
  fechaFin: string | null
): { ini: number; fin: number } | null {
  const deTexto = parseFechaTexto(fechaTexto)
  if (deTexto) return deTexto

  const a = parseFechaISO(fechaIni)
  const b = parseFechaISO(fechaFin)
  if (a === null && b === null) return null
  // Rango invertido (mal parseado por el extractor) → evento de un solo día en fecha_fin
  if (a !== null && b !== null && a > b) return { ini: b, fin: b }
  const ini = a ?? (b as number)
  return { ini, fin: Math.max(ini, b ?? ini) }
}

export function msToISO(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// El servidor corre en UTC, donde entre las 19:00 y las 24:00 de Lima ya es el
// día siguiente. El cron `inactivar-convocatorias-vencidas` compara contra la
// fecha de Lima, así que cualquier decisión sobre `estado` debe usar la misma.
export function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
