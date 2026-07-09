export interface CronogramaEtapa {
  actividad: string
  fechaTexto: string | null
  fechaIni: string | null
  fechaFin: string | null
  responsable: string | null
  estado: string | null
  semana: { desde: number; hasta: number } | null
}

export interface CronogramaGrupo {
  nombre: string
  etapas: CronogramaEtapa[]
}

export interface Cronograma {
  calculadoAl?: string | null
  totalEtapas?: number | null
  totalSemanas?: number | null
  grupos: CronogramaGrupo[]
}

export interface DocumentoOficial {
  tipo: string
  etiqueta?: string
  url: string
  disponible: boolean
}

export interface ConvocatoriaListItem {
  id: number
  slug: string
  titulo: string
  ubicacion: string
  sueldo: number
  fecha_limite: string
  tipo_contrato: string
  nivel: string[]
  req_preview: string[]
  modalidad: string
  vacantes: number | null
  fecha_inicio_postulacion: string | null
  entidades: { nombre_oficial: string } | null
}

export interface ConvocatoriaDetail extends ConvocatoriaListItem {
  fecha_pub: string
  descripcion: string | null
  requisitos: string[] | null
  funciones: string[] | null
  documentos: string[] | null
  requerimientos: Record<string, unknown> | null
  link_oficial: string | null
  entidad_id: string
  estado: string
  nro_convocatoria: string | null
  codigo_plaza: string | null
  unidad: string | null
  fecha_resultados: string | null
  // JSONB: filas antiguas pueden traer `[]` o el array plano viejo — normalizar
  // con normalizeCronograma() de lib/convocatoria.ts antes de renderizar
  cronograma: Cronograma | null
  documentos_oficiales: DocumentoOficial[] | null
}
