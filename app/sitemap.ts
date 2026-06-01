import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { BASE_URL, slugifyEntidad } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const grace = new Date()
  grace.setDate(grace.getDate() - 30)
  const graceDateStr = grace.toISOString().split('T')[0]

  const [{ data: convocatorias }, { data: entidades }] = await Promise.all([
    db.from('convocatorias')
      .select('slug, fecha_pub, fecha_limite')
      .eq('indexable', true)
      .gte('fecha_limite', graceDateStr)
      .order('fecha_pub', { ascending: false })
      .limit(500),
    db.from('entidades')
      .select('nombre_oficial'),
  ])

  const today = new Date().toISOString().split('T')[0]
  const convocatoriasUrls: MetadataRoute.Sitemap = (convocatorias ?? []).map((c, i) => {
    const activa = c.fecha_limite >= today
    return {
      url: `${BASE_URL}/convocatorias/${c.slug}`,
      lastModified: new Date(c.fecha_pub),
      changeFrequency: 'weekly' as const,
      priority: activa ? (i < 50 ? 0.9 : i < 200 ? 0.8 : 0.6) : 0.3,
    }
  })

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
