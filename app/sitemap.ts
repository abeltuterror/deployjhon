import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { BASE_URL, slugifyEntidad } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  const [{ data: convocatorias }, { data: entidades }] = await Promise.all([
    db.from('convocatorias')
      .select('slug, fecha_pub')
      .eq('estado', 'activa')
      .eq('indexable', true)
      .gte('fecha_limite', today)
      .order('fecha_pub', { ascending: false })
      .limit(300),
    db.from('entidades')
      .select('nombre_oficial'),
  ])

  const convocatoriasUrls: MetadataRoute.Sitemap = (convocatorias ?? []).map((c, i) => ({
    url: `${BASE_URL}/convocatorias/${c.slug}`,
    lastModified: new Date(c.fecha_pub),
    changeFrequency: 'weekly',
    priority: i < 50 ? 0.9 : i < 200 ? 0.8 : 0.6,
  }))

  const entidadesUrls: MetadataRoute.Sitemap = (entidades ?? []).map(e => ({
    url: `${BASE_URL}/entidades/${slugifyEntidad(e.nombre_oficial)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    ...entidadesUrls,
    ...convocatoriasUrls,
  ]
}
