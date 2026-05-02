# CONTEXT.md — Convocape

> Archivo de contexto del proyecto. Generado para que una IA pueda entender
> el estado actual sin necesidad de leer todo el código fuente.

---

## 1. Resumen del proyecto

**Convocape** es una plataforma web de convocatorias laborales del sector público peruano.
Centraliza y normaliza ofertas de empleo de entidades del Estado (CAS, D.L. 728, D.L. 276),
permitiendo a ciudadanos buscar, filtrar y postular. Tiene un canal B2G para que entidades
publiquen sus propias convocatorias, y un panel admin para el dueño de la plataforma.

- **Usuario objetivo:** Ciudadano peruano que busca empleo en el Estado. Secundario: RRHH de entidades públicas.
- **Estado actual:** MVP funcional en desarrollo. UI completada, base de datos por poblar.

---

## 2. Stack tecnológico

### Frameworks y librerías (package.json)

| Paquete | Versión | Rol |
|---------|---------|-----|
| `next` | 16.2.4 | Framework principal (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.4 | UI runtime |
| `typescript` | ^5 | Tipado estático strict |
| `tailwindcss` | ^4 | Estilos (usa `@theme` CSS, no `tailwind.config.ts`) |
| `@tailwindcss/postcss` | ^4 | Plugin PostCSS para Tailwind v4 |
| `@supabase/supabase-js` | ^2.105.1 | Cliente Supabase (queries, auth) |
| `@supabase/ssr` | ^0.10.2 | Cliente Supabase SSR-compatible con cookies |
| `zod` | (transitiva, no declarada) | Validación de esquemas en Server Actions |

> ⚠️ **Deuda técnica:** `zod` está instalada como dependencia transitiva pero no declarada
> en `package.json`. Ejecutar `npm install zod` para hacerla explícita.

### Recursos externos (CDN, no npm)

- **Font Awesome 6.5.1** — iconos, cargado via `@import` en `globals.css`
- **Google Fonts** — `Outfit` (headings) + `DM Sans` (body), cargados via `@import` en `globals.css`

### Servicios externos

| Servicio | Uso |
|----------|-----|
| Supabase | PostgreSQL + Auth (email/password + Google OAuth) |
| Google OAuth | Login social via Supabase Auth Provider |

### Deploy y CI/CD

- Target: Vercel (inferido por estructura Next.js + comentarios en código)
- CI/CD: no configurado aún
- Variables de entorno: solo `.env.local` (ver sección 9)

---

## 3. Estructura de carpetas

```
/
├── app/                        # App Router — rutas y Server Actions
│   ├── page.tsx                # Homepage principal (Server Component)
│   ├── layout.tsx              # Root layout — monta providers y paneles globales
│   ├── globals.css             # Estilos globales, @theme Tailwind v4, animaciones
│   ├── actions.ts              # TODOS los Server Actions ('use server')
│   └── auth/
│       └── callback/
│           └── route.ts        # Route Handler: intercambia OAuth code por sesión
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Navbar fija con scroll effect + auth state + triggers de paneles
│   │   └── Footer.tsx          # Footer estático con links
│   ├── panels/                 # Drawers slide-in desde la derecha (z-50)
│   │   ├── DetailModal.tsx     # Detalle completo de convocatoria (fetch on open)
│   │   ├── UserPanel.tsx       # Panel de usuario: login form o tabs (Guardadas/Postulaciones/Alertas)
│   │   └── AdminPanel.tsx      # Panel admin: Lista / Nueva convocatoria / Estadísticas
│   ├── sections/               # Secciones de página (bloques visuales grandes)
│   │   ├── HeroSection.tsx     # Hero con search bar y contadores animados
│   │   ├── Filters.tsx         # Filtros avanzados (URL Search Params)
│   │   ├── ConvocatoriasGrid.tsx # Grid de tarjetas con contador de resultados
│   │   └── SortSelect.tsx      # Dropdown de ordenamiento
│   ├── shared/                 # Componentes reutilizables entre secciones
│   │   ├── Pagination.tsx      # Paginación URL-based
│   │   └── RevealObserver.tsx  # IntersectionObserver global para animaciones .reveal
│   └── ui/                     # Átomos UI
│       ├── ConvocatoriaCard.tsx # Tarjeta de convocatoria con urgencia y tags
│       ├── BookmarkButton.tsx  # Botón guardar (localStorage por ahora)
│       └── OpenDetailButton.tsx # Botón que abre DetailModal via context
│
├── lib/
│   └── supabase/
│       └── client.ts           # createBrowserClient() factory para Client Components
│
├── providers/                  # React Context providers ('use client')
│   ├── AuthProvider.tsx        # user, profile (con rol), signOut. Se suscribe a onAuthStateChange
│   ├── DetailProvider.tsx      # openId del panel de detalle
│   └── PanelProvider.tsx       # activePanel: 'user' | 'admin' | null
│
├── types/
│   └── convocatoria.ts         # ConvocatoriaListItem (grid) y ConvocatoriaDetail (panel)
│
└── pasado/                     # Prototipo original en HTML/JS vanilla (solo referencia, no en build)
    ├── index.html
    └── datos.json              # Dataset de muestra para seed de la base de datos
```

---

## 4. Módulos completados

| Módulo | Descripción |
|--------|-------------|
| **Homepage con filtros** | Server Component con 7 filtros (q, ubicacion, entidad, contrato, salario, nivel, fecha) todos delegados a PostgreSQL via `.eq()`, `.ilike()`, `.contains()`, etc. |
| **Paginación URL-based** | 12 items/página, `?pagina=N` en URL, navegación client-side sin full reload |
| **ConvocatoriaCard** | Tarjeta con tags de contrato/nivel, urgencia por días (1-3 rojo, 4-7 naranja, +7 verde), req_preview |
| **DetailModal** | Panel slide-in con fetch lazy al abrir, skeleton loading, botones sticky Guardar + Postular, Escape handler, body overflow lock |
| **Filtros cacheados** | `unstable_cache(revalidate: 3600)` para ubicaciones/contratos/entidades — evita 3 full-table scans por request |
| **HeroSection** | Hero fullscreen con contadores animados (IntersectionObserver), barra de búsqueda, gradiente andino |
| **Navbar** | Fija transparente → blur oscuro al scroll >80px, menú mobile, avatar con inicial del usuario |
| **AuthProvider** | Session en SSR vía cookies, `onAuthStateChange` para reactive state, carga perfil con rol |
| **UserPanel** | Si no autenticado: form Login (email + Google OAuth, estilo PillaPago). Si autenticado: 3 tabs con lazy-load |
| **AdminPanel** | Acceso solo si `profile.rol === 'admin'`. Lista con tabla y delete, formulario Nueva (Zod + entity resolution), Estadísticas con KPIs y barras |
| **Server Actions** | `getConvocatoriaDetail`, `toggleGuardado`, `getAdminConvocatorias`, `getAdminStats`, `submitConvocatoria` (con guard admin + entity resolution), `deleteConvocatoria` |
| **OAuth callback** | Route Handler en `/auth/callback` que intercambia code por sesión Supabase |
| **Scroll animations** | `.reveal` con `IntersectionObserver` global (RevealObserver), respeta `prefers-reduced-motion` |

---

## 5. Módulos pendientes o en progreso

| Módulo | Estado | Notas |
|--------|--------|-------|
| **Páginas de auth** | Faltante | `/register`, `/login`, `/forgot-password` existen como links pero no tienen page.tsx. El login actual vive embebido en UserPanel |
| **SEO técnico** | Faltante | `generateMetadata` dinámica, JSON-LD `JobPosting`, `sitemap.ts`, `robots.ts` (definido en CLAUDE.md Skill SEO) |
| **Página de detalle** | Faltante | `/convocatorias/[slug]/page.tsx` — necesaria para SEO, Google for Jobs y URLs compartibles |
| **API scraper** | Faltante | `POST /api/convocatorias` — Route Handler con API Key, Zod, entity resolution. El scraper externo necesita este endpoint |
| **BookmarkButton → Supabase** | Incompleto | Actualmente usa `localStorage`. Debe conectarse a tabla `guardados` cuando el usuario está logueado |
| **Postulaciones** | Incompleto | El botón "Postular" en DetailModal abre `link_oficial` pero no inserta en tabla `postulaciones` |
| **Alertas — notificaciones** | Incompleto | Se pueden crear alertas en UserPanel pero no hay mecanismo de envío (email/push) |
| **Asistente IA** | Faltante | Aparece en Navbar pero no tiene implementación |
| **RLS en Supabase** | Faltante | Las políticas de Row Level Security aún no están aplicadas en la base de datos |
| **Admin — editar convocatoria** | Faltante | AdminPanel tiene crear y eliminar, pero no editar |
| **Seed de datos** | Pendiente | `pasado/datos.json` tiene datos de muestra listos para seed |

---

## 6. Convenciones de código

### Componentes

- **Server Component por defecto** — cualquier archivo sin `'use client'` es Server Component
- **`'use client'`** — solo cuando hay hooks, eventos del DOM, o localStorage
- **`'use server'`** — solo en `app/actions.ts` (todos los Server Actions en un solo archivo)
- **Naming:** `PascalCase` para componentes y tipos, `camelCase` para funciones y variables

### Imports

```ts
// Orden convencional en el proyecto:
import { ... } from 'react'             // 1. React/Next.js core
import { ... } from 'next/...'          // 2. Next.js utilities
import ComponentName from '@/components/...'  // 3. Componentes propios (@/ alias)
import { ... } from '@/providers/...'   // 4. Providers
import type { ... } from '@/types/...'  // 5. Tipos (siempre como `import type`)
```

### Alias de paths

- `@/` → raíz del proyecto (configurado en `tsconfig.json`)

### Patrones que se repiten

- **Slide panels:** `visible` (monta el DOM) → `panelOpen` (dispara CSS transition) → `slide-panel closed` class. Cierre: quita `panelOpen` → `setTimeout(400)` → quita `visible`.
- **Supabase relations:** Siempre castear con `as unknown as MyType[]` porque PostgREST devuelve relaciones como arrays aunque sean single-row.
- **Filtros URL:** `useSearchParams` → `new URLSearchParams(params.toString())` → `router.push(...)` sin scroll.

### TailwindCSS v4

- Colores y fuentes en `@theme {}` en `globals.css`, **no** en `tailwind.config.ts`
- Custom colors: `peru-red`, `peru-dark`, `peru-light`, `peru-glow`, `slate-850`
- Custom fonts: `font-heading` (Outfit), `font-body` (DM Sans)
- Font weights: `font-600`, `font-700`, `font-800`, `font-900` (definidos como `--font-weight-*` en `@theme`)

---

## 7. Modelos de base de datos

### `entidades`
```
id             UUID PK (gen_random_uuid)
nombre_oficial TEXT UNIQUE NOT NULL
sinonimos      TEXT[]
validada       BOOLEAN DEFAULT false
dominio_email  TEXT  -- ej: 'minedu.gob.pe' para B2G
```

### `perfiles`
```
id         UUID PK → references auth.users(id)
rol        TEXT DEFAULT 'ciudadano'  -- 'ciudadano' | 'entidad_pendiente' | 'entidad_verificada' | 'admin'
entidad_id UUID → references entidades(id)
```
> Creado automáticamente por trigger `on_auth_user_created` al registrarse.

### `convocatorias`
```
id            BIGINT PK
entidad_id    UUID → references entidades(id)
titulo        TEXT NOT NULL
slug          TEXT UNIQUE NOT NULL
ubicacion     TEXT NOT NULL
sueldo        NUMERIC NOT NULL
fecha_pub     DATE NOT NULL
fecha_limite  DATE NOT NULL
tipo_contrato TEXT  -- 'CAS' | 'D.L. 728' | 'D.L. 276'
nivel         TEXT[]  -- ['Técnico'] | ['Universitario'] | ['Maestría'] | combinaciones
descripcion   TEXT
requisitos    TEXT[]
req_preview   TEXT[]  -- subconjunto corto (máx 3) para tarjetas
funciones     TEXT[]
documentos    TEXT[]
requerimientos JSONB
modalidad     TEXT DEFAULT 'Presencial'  -- 'Presencial' | 'Híbrida' | 'Remota'
link_oficial  TEXT
estado        TEXT DEFAULT 'activa'
```

### `guardados`
```
id              BIGSERIAL PK
user_id         UUID → references auth.users(id)
convocatoria_id BIGINT → references convocatorias(id)
created_at      TIMESTAMPTZ
UNIQUE(user_id, convocatoria_id)
```

### `postulaciones`
```
id              BIGSERIAL PK
user_id         UUID → references auth.users(id)
convocatoria_id BIGINT → references convocatorias(id)
created_at      TIMESTAMPTZ
UNIQUE(user_id, convocatoria_id)
```

### `alertas`
```
id         BIGSERIAL PK
user_id    UUID → references auth.users(id)
texto      TEXT NOT NULL  -- búsqueda libre, ej: 'CAS Enfermero Lima'
created_at TIMESTAMPTZ
```

### Relaciones clave

- `convocatorias.entidad_id` → `entidades.id` (ON DELETE SET NULL)
- `perfiles.id` = `auth.users.id` (mismo UUID del JWT de Supabase)
- `guardados` y `postulaciones` son tablas de unión usuario↔convocatoria

---

## 8. Endpoints y Server Actions

### Route Handlers (HTTP)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | No | Homepage con filtros y paginación |
| `GET` | `/auth/callback` | No | Intercambia OAuth code por sesión de Supabase |
| `POST` | `/api/convocatorias` | API Key (pendiente) | Ingesta de scraper — **NO implementado aún** |

### Server Actions (`app/actions.ts`)

| Función | Auth requerida | Descripción |
|---------|---------------|-------------|
| `getConvocatoriaDetail(id)` | No | Retorna todos los campos de una convocatoria para el panel de detalle |
| `toggleGuardado(convocatoriaId, userId)` | Sí (userId manual) | Inserta o elimina de `guardados`, retorna nuevo estado |
| `getAdminConvocatorias()` | Admin | Lista todas las convocatorias para la tabla del AdminPanel |
| `getAdminStats()` | Admin | Calcula KPIs en Node.js: total, activas, sueldo promedio/máx, distribución por contrato/nivel/ubicación |
| `submitConvocatoria(formData)` | Admin | Valida con Zod, resuelve entidad (lookup o crea nueva), inserta convocatoria, revalida `/` |
| `deleteConvocatoria(id)` | Admin | Elimina convocatoria, revalida `/` |

> **Nota:** `getAdminStats()` actualmente computa la agregación en Node.js iterando todos los registros. Para >10k convocatorias debería migrarse a una RPC de PostgreSQL.

---

## 9. Variables de entorno necesarias

```env
# Supabase — requeridas para cualquier funcionalidad
NEXT_PUBLIC_SUPABASE_URL=       # URL del proyecto Supabase (ej: https://xxx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Clave pública anon (safe para exponer al cliente)
```

> Las credenciales de Google OAuth (Client ID + Secret) se configuran **solo en el Dashboard de Supabase**
> (Authentication → Providers → Google), no en variables de entorno de Next.js.

> No existe `.env.example` en el proyecto. Recomendado crearlo para onboarding.

---

## 10. Decisiones técnicas importantes

### Sin ORM — Supabase JS directo
CLAUDE.md prohíbe Prisma/TypeORM/Drizzle. Todas las queries usan `@supabase/supabase-js` con el
query builder nativo. Razón: evitar la capa de abstracción y aprovechar las features específicas
de PostgREST (RLS, relations embebidas, `select` fields projection).

### URL Search Params como única fuente de verdad de filtros
Los filtros no tienen estado en React (`useState`). Cada cambio hace `router.push(?param=valor)`,
el Server Component re-ejecuta con los nuevos `searchParams` y PostgreSQL filtra todo.
Ventaja: URLs compartibles, back/forward del browser gratis, cero desincronización.

### Server Components por defecto
`'use client'` solo donde es necesario (scroll, clicks, localStorage, contexto).
La página principal es un Server Component — Supabase se llama en el servidor,
el cliente recibe HTML renderizado, no JSON que React hidrata.

### `unstable_cache` para opciones de filtro
Las listas de ubicaciones, contratos y entidades se cacheaban en JS re-computando `new Set()`
sobre todos los registros en cada request. Con `unstable_cache(revalidate: 3600)` se ejecutan
una vez por hora. Ahorra ~150ms de latencia por request en producción.

### TailwindCSS v4 con `@theme`
En Tailwind v4 los tokens de diseño van en `@theme {}` dentro del CSS, no en `tailwind.config.ts`.
Usar `tailwind.config.ts` para colores custom no funciona en v4.

### Slide panels en lugar de páginas de detalle
Los detalles de convocatoria abren en un drawer (DetailModal) en lugar de navegar a `/convocatorias/[slug]`.
Esto mejora la UX (contexto no se pierde) pero es una **deuda SEO**: Google no puede indexar el contenido
del drawer. **Pendiente:** crear `app/convocatorias/[slug]/page.tsx` con SSG/ISR para Google for Jobs.

### Deuda técnica conocida
1. `zod` no declarada en `package.json` — funciona como transitiva pero es frágil
2. `BookmarkButton` usa `localStorage`, no la tabla `guardados` de Supabase
3. El botón "Postular" no registra en `postulaciones`
4. `getAdminStats()` itera arrays en Node.js — migrarlo a RPC PostgreSQL antes de >10k registros
5. Sin RLS aplicado en Supabase aún — cualquier usuario puede leer/escribir todo
6. No hay página `/convocatorias/[slug]` para SEO
