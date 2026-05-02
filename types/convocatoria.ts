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
}
