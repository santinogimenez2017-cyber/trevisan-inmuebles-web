# Trevisan Inmuebles — Resumen técnico y comercial del proyecto

Sitio web inmobiliario de **Trevisan Inmuebles** (Roque González 1137, N3300 Posadas, Misiones, Argentina).
Catálogo público de propiedades en venta y alquiler, con un panel de administración (`/admin`) para cargar, editar y despublicar propiedades y para leer las consultas recibidas, sin tocar código.

> **Fuente de verdad del proyecto.** Describe el estado de la rama `main` en el commit `a81ddc7` (consultas en Supabase + email con Resend + `whatsapp_click` en el Navbar + GTM/GA4 por variables de entorno). Las cifras de build se midieron con `npm run build` sobre ese código. Donde algo **no existe** en el código, o **no fue verificado**, se indica expresamente (ver la sección 8). Si cambiás rutas, hooks, el esquema de la base, eventos o variables de entorno, actualizá este archivo en el mismo commit.
>
> **Historial de cambios**
> | Commit | Cambio |
> |---|---|
> | `eb122cb` | Panel `/admin`: login con Supabase Auth, tabla `admins`, RLS, alta/edición/estado/borrado de propiedades |
> | `572af63` | Subida de fotos: bucket público `property-images`, dropzone con miniaturas, reordenar, quitar, portada |
> | `a81ddc7` | **Consultas:** tabla `contacts` con RLS (los visitantes solo insertan) y pestaña **Consultas** en `/admin` · **Email:** función serverless `api/contact.ts` (Resend) que avisa cada consulta a `VITE_CONTACT_EMAIL`, con `contacts` como respaldo · **Analítica:** `whatsapp_click` en el Navbar, `VITE_GTM_ID` y `VITE_GA4_ID` leídos solo en `vite.config.ts` con validación de formato · `README.md` reescrito y `.env.example` completo |
> | *(este commit)* | **Mapa interactivo:** componente `PropertyMap.tsx` con `iframe` responsivo de Google Maps Embed (sin API key); usa coordenadas `latitude`/`longitude` si existen, y si no, la dirección concatenada · Columnas `latitude numeric` y `longitude numeric` (opcionales) en `public.properties` · Tipos `Property` y `PropertyRow` actualizados · Inputs Latitud / Longitud en `PropertyForm` · `PropertyMap` integrado en `PropertyDetailPage`, debajo de Características |
>
> **Índice rápido:** rutas → 3.1 · hooks y funciones de datos → 3.2 · flujo de una consulta → 3.4 · tablas y RLS → 4 · eventos → 5 · bundle → 6 · despliegue → 7 · qué está verificado → 8.

---

## 0. Resumen comercial

| Aspecto | Detalle |
|---|---|
| Qué es | Sitio web + catálogo + panel de gestión de propiedades |
| Catálogo actual | 86 propiedades cargadas (`supabase_seed.sql`, importadas de trevisan.com.ar) |
| Tipos de propiedad | Casa, Departamento, Terreno, Local, PH, Oficina |
| Operaciones | Venta y Alquiler, precios en USD o ARS (`$`) |
| Canales de contacto | WhatsApp (+54 9 376 475-5777), teléfono (+54 376 443-1739), email (info@trevisan.com.ar), formularios de consulta, mapa |
| Consultas | Cada formulario se guarda en Supabase **y** se avisa por email a la inmobiliaria; se gestionan en `/admin` → Consultas (nuevo / leído / respondido / archivado) |
| Gestión de contenido | Panel `/admin` protegido por login: alta/edición, subida de fotos, cambio rápido de estado (disponible / reservado / vendido / alquilado), eliminación, bandeja de consultas |
| Medición | Google Tag Manager y GA4 con eventos de lead (WhatsApp, formulario, búsquedas) |
| Hosting | Vercel (SPA + una función serverless para el email, caché inmutable para `/assets`) |
| Backend | Supabase (PostgreSQL + Auth + Storage) + Resend (email); un único endpoint serverless propio |

**Valor para el negocio:** el equipo publica o pausa una propiedad en segundos desde el navegador (con fotos subidas desde la computadora), ninguna consulta se pierde (llega por email y queda guardada) y cada contacto relevante queda medible.

---

## 1. Stack tecnológico y dependencias

Versiones **instaladas** (verificadas con `npm ls`); `package.json` declara rangos `^`/`~`.

### Runtime (`dependencies`)

| Paquete | Versión instalada | Uso |
|---|---|---|
| `react` / `react-dom` | 19.3.1 | UI |
| `react-router-dom` | 7.18.5 | Ruteo SPA (`BrowserRouter`) |
| `@supabase/supabase-js` | 2.118.0 | Base de datos, Auth y Storage (carga dinámica) |
| `framer-motion` | 14.7.1 | Transiciones de página, animaciones de entrada, `layoutId` tarjeta → detalle |
| `gsap` | 3.15.0 | Animaciones del hero y ScrollTrigger (carga dinámica) |
| `lenis` | 1.3.27 | Scroll suave, solo en escritorio |
| `lucide-react` | 1.64.0 | Iconografía |

### Build y desarrollo (`devDependencies`)

| Paquete | Versión instalada |
|---|---|
| `vite` | 8.3.5 |
| `@vitejs/plugin-react` | 6.1.2 |
| `tailwindcss` / `@tailwindcss/vite` | 4.3.3 |
| `typescript` | 7.0.2 |
| `oxlint` | 1.90.0 |
| `autoprefixer` | 10.6.2 |
| `@types/react` / `@types/react-dom` | 19.3.0 |
| `@types/node` | 24.19.2 |

### Otros

- **Tipografías:** Cormorant Garamond (títulos) e Inter (texto), vía Google Fonts con `preconnect`.
- **Tema (Tailwind v4 `@theme` en `src/index.css`):** `paper #f3f1ec`, `linen #ebe8e0`, `ink #121316`, `ink-soft #52525b`, `accent #b9560d`, `accent-deep #9a4208`.
- **Alias:** `@` → `src/` (`vite.config.ts`).
- **Plugin propio `trevisan-analytics`** (`vite.config.ts`): es el **único** lugar donde se leen `VITE_GTM_ID` y `VITE_GA4_ID`. Cada uno se valida por formato (`^GTM-[A-Z0-9]+$` y `^G-[A-Z0-9]+$`) y se inyecta en `index.html` (`%VITE_GTM_ID%`, `%VITE_GA4_ID%`). Un valor vacío o inválido se reemplaza por `''` (el snippet no hace nada) y, si era inválido, el build muestra un aviso. Sin GTM válido se elimina además el `<noscript>`.
- **Scripts:** `npm run dev`, `npm run build` (`tsc -b && vite build`; `tsc -b` también revisa `vite.config.ts` y `api/`), `npm run lint` (oxlint), `npm run preview`.

### Variables de entorno (`.env.example`)

Las `VITE_*` se leen en **build time**: tras cambiarlas en Vercel hay que redesplegar. Las de email las lee solo la función serverless, en tiempo de ejecución.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase (se tolera el sufijo `/rest/v1`) |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública *anon*. Nunca usar `service_role` |
| `VITE_GTM_ID` | No | ID del contenedor GTM (`GTM-XXXXXXX`) |
| `VITE_GA4_ID` | No | ID de medición GA4 (`G-XXXXXXXXXX`), cargado con gtag.js. Dejar vacío si GA4 ya está dentro del contenedor GTM (evita contar cada evento dos veces) |
| `VITE_CONTACT_EMAIL` | Para el email | Casilla de la inmobiliaria que recibe las consultas |
| `RESEND_API_KEY` | Para el email | Clave de Resend. **Secreta**: solo del lado servidor, nunca con prefijo `VITE_` |
| `RESEND_FROM` | No | Remitente (dominio verificado en Resend). Por defecto `onboarding@resend.dev`, que solo entrega a la casilla del dueño de la cuenta de Resend |

> `VITE_CONTACT_EMAIL` lleva prefijo `VITE_` por requisito del pedido, pero la lee únicamente `api/contact.ts` en el servidor; ningún componente del front la usa, así que la dirección no queda en el bundle público.

---

## 2. Estructura del proyecto

```
Trevisan 3D/
├── package.json / package-lock.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json   # node.json también revisa vite.config.ts y api/
├── .oxlintrc.json              # Reglas de oxlint
├── .env.example                # Plantilla de variables de entorno (la real, .env.local, no se versiona)
├── README.md                   # Guía de puesta en marcha para desarrolladores
├── PROJECT_SUMMARY.md          # Este documento
├── index.html                  # Snippets GTM y GA4, fuentes, metadatos OG
├── vite.config.ts              # React + Tailwind + plugin trevisan-analytics + alias @
├── vercel.json                 # Rewrite SPA (excluye /api) + caché inmutable de /assets
├── api/
│   └── contact.ts              # Función serverless: POST /api/contact → email vía Resend
├── supabase_schema.sql         # Tablas (properties, admins, contacts), RLS, trigger de slug, bucket de Storage
├── supabase_seed.sql           # 86 propiedades iniciales (idempotente)
├── scripts/                    # (vacía)
├── public/                     # favicon.svg, icons.svg, assets/icons/{facebook,instagram,whatsapp}.svg
└── src/
    ├── main.tsx                # Punto de entrada
    ├── App.tsx                 # Rutas, lazy loading, prefetch, ScrollToTop
    ├── index.css               # Tailwind v4 + tema
    ├── vite-env.d.ts           # Tipos de import.meta.env
    ├── components/
    │   ├── hero/
    │   │   ├── HeroSection.tsx         # Hero + buscador (evento property_search)
    │   │   └── HeroParticles.tsx       # Partículas (se pausan fuera de pantalla: IntersectionObserver)
    │   ├── layout/
    │   │   ├── Navbar.tsx              # Enlaces de WhatsApp escritorio/móvil (evento whatsapp_click)
    │   │   ├── Footer.tsx              # Enlaces de contacto (evento whatsapp_click)
    │   │   ├── PageTransition.tsx      # Animación de entrada/salida de rutas
    │   │   └── SmoothScroll.tsx        # Monta Lenis solo con puntero fino y sin reduced-motion
    │   ├── property/
    │   │   ├── PropertyCard.tsx        # Tarjeta de propiedad
    │   │   ├── Lightbox.tsx            # Galería a pantalla completa
    │   │   └── PropertyMap.tsx         # Mapa Google Maps Embed (sin API key) para el detalle de la propiedad
    │   ├── sections/                   # Secciones de la home
    │   │   ├── FeaturedSection.tsx     # Destacadas
    │   │   ├── CategoriesSection.tsx   # Categorías
    │   │   ├── ArchTourSection.tsx     # Recorrido visual
    │   │   ├── AboutSection.tsx        # Nosotros (#nosotros)
    │   │   └── ContactSection.tsx      # Contacto (#contacto; guarda + envía la consulta; eventos form_submit y whatsapp_click)
    │   └── ui/
    │       ├── Skeleton.tsx            # Skeleton, PropertyCardSkeleton, PropertyGridSkeleton, PropertyDetailSkeleton, LoadError
    │       └── SocialIcon.tsx
    ├── data/
    │   ├── properties.ts       # Tipos (Property…) y helpers puros: filtros, formato es-AR, pickShowcase
    │   └── contact.ts          # WhatsApp/teléfono + whatsappUrl()
    ├── hooks/
    │   └── useProperties.ts    # useProperties, useNeighborhoods, usePropertyBySlug
    ├── lib/
    │   ├── supabase.ts         # Clientes (público y admin), PropertyRow, toProperty(), queries, submitContact()
    │   ├── contact.ts          # sendContact(): guarda en Supabase + llama a /api/contact en paralelo
    │   ├── analytics.ts        # Eventos a dataLayer y a GA4 (gtag) si está cargado
    │   ├── gsap.ts / loadGsap.ts       # GSAP + ScrollTrigger cargados dinámicamente
    │   ├── smoothScroll.ts     # Lenis impulsado por el ticker de GSAP
    │   ├── scroll.ts           # scrollToTop / scrollToSectionWhenReady (con o sin Lenis)
    │   └── useSectionLink.ts   # Navegación a #secciones desde cualquier ruta
    └── pages/
        ├── HomePage.tsx
        ├── ListingsPage.tsx            # /propiedades (filtros, orden, query params)
        ├── PropertyDetailPage.tsx      # /propiedad/:slug
        ├── NotFoundPage.tsx
        └── admin/
            ├── AdminPage.tsx           # Dashboard con pestañas Propiedades / Consultas
            ├── ContactsPanel.tsx       # Bandeja de consultas (filtro por estado, cambiar estado, eliminar)
            ├── AdminLogin.tsx
            ├── useAdminSession.ts      # Sesión + verificación is_admin(); signIn()
            ├── api.ts                  # CRUD de propiedades y consultas + uploadPropertyImage()
            ├── PropertyForm.tsx        # Modal de alta/edición
            └── PhotoManager.tsx        # Dropzone, miniaturas, reordenar, quitar, portada
```

---

## 3. Flujo de datos y rutas

### 3.1 Rutas

| Ruta | Tipo | Componente | Notas |
|---|---|---|---|
| `/` | Pública | `HomePage` | Hero, destacadas, categorías, recorrido, nosotros, contacto |
| `/propiedades` | Pública | `ListingsPage` (lazy) | Filtros por query params: `operacion`, `tipo`, `barrio`, `minPrecio`, `maxPrecio`, `moneda`, `dormitorios` |
| `/propiedad/:slug` | Pública | `PropertyDetailPage` (lazy) | Galería, Lightbox, WhatsApp, compartir, formulario "Solicitar información" (guarda + envía la consulta con el `property_id`) |
| `/admin` y `/admin/*` | **Protegida** | `AdminPage` (lazy) | Pantalla independiente: sin Navbar, Footer ni transición. Pestañas **Propiedades** y **Consultas**. Inyecta `<meta name="robots" content="noindex, nofollow">` |
| `*` | Pública | `NotFoundPage` | Sin Navbar ni Footer |
| `POST /api/contact` | Endpoint (no es una ruta de la SPA) | `api/contact.ts` | Función serverless de Vercel; `vercel.json` excluye `/api` del rewrite a `index.html` |

Anclas de la home: `/#nosotros`, `/#contacto`. Cambios de ruta vuelven al tope, salvo que la URL traiga `#hash` (entonces se espera a que la sección exista y se hace scroll).

**Protección de `/admin`:** el acceso se decide en `useAdminSession` con cinco estados: `loading`, `unconfigured`, `signedOut`, `forbidden` (autenticado pero no admin) y `admin`. Estar logueado no basta: se llama al RPC `is_admin()`. Ocultar la UI no protege nada por sí solo; **la seguridad real está en RLS** (sección 4).

### 3.2 Hooks y su relación con Supabase

> No existe un hook `useAuth`. La autenticación del admin está en `useAdminSession` (`src/pages/admin/useAdminSession.ts`).

| Hook / función | Archivo | Qué hace |
|---|---|---|
| `useProperties()` | `hooks/useProperties.ts` | Lee propiedades con `status = 'disponible'`, orden `created_at` descendente. Store compartido (`useSyncExternalStore`): hero, categorías, destacadas y catálogo se suscriben a **una sola** request. La descarga arranca al evaluarse el bundle, en paralelo al montaje de React. Reintenta si falló. Devuelve `{ properties, loading, error, refetch }` |
| `useNeighborhoods()` | idem | Barrios únicos y ordenados (`localeCompare 'es'`) para los filtros |
| `usePropertyBySlug(slug)` | idem | Consulta puntual por `slug` (`status = 'disponible'`). Si el listado ya está en memoria, devuelve la propiedad al instante (sin parpadeo desde una tarjeta) y la consulta dedicada prevalece al resolver |
| `useAdminSession()` | `pages/admin/useAdminSession.ts` | Sesión de Supabase Auth + `rpc('is_admin')`. Expone `{ session, signOut }`. `signIn(email, password)` usa `signInWithPassword` |

**Dos clientes de Supabase** (`src/lib/supabase.ts`), ambos con carga dinámica (`import()`) para no inflar el bundle inicial:

| Cliente | Sesión | Uso |
|---|---|---|
| `getSupabase()` | No persiste (`persistSession: false`) → siempre rol `anon` | Sitio público |
| `getAdminSupabase()` | Persiste en localStorage (`storageKey: 'trevisan-admin-auth'`) | Panel admin: las escrituras llevan el JWT del usuario |

- Timeout de 8 s en las lecturas públicas y en `submitContact` (`run()`); errores normalizados a `Error`.
- Las filas se traducen a `Property` con `toProperty()`: los componentes nunca ven el esquema snake_case. Se descartan las filas sin imágenes.
- Si faltan `slug` o `neighborhood`, se calculan (slug desde el título + 8 caracteres del `id`; barrio desde `location`).

**Funciones de datos que no son hooks** (se llaman desde manejadores de eventos):

| Función | Archivo | Qué hace |
|---|---|---|
| `fetchAvailableProperties()` / `fetchPropertyBySlug(slug)` | `lib/supabase.ts` | Lecturas públicas (cliente `anon`) que alimentan los hooks |
| `submitContact(c)` | `lib/supabase.ts` | INSERT en `contacts` con el cliente `anon` (la RLS solo permite insertar) |
| `sendContact(c)` | `lib/contact.ts` | Punto único de los dos formularios: `submitContact` + `POST /api/contact` en paralelo; ver 3.4 |
| `trackWhatsAppClick`, `trackPropertySearch`, `trackFormSubmit` | `lib/analytics.ts` | Eventos de analítica; ver 5.3 |
| `fetchAllProperties`, `saveProperty`, `setPropertyStatus`, `deleteProperty`, `uploadPropertyImage`, `fetchContacts`, `setContactStatus`, `deleteContact` | `pages/admin/api.ts` | Capa de datos del admin (cliente autenticado); ver 3.3 |

### 3.3 Capa de datos del admin (`pages/admin/api.ts`)

`fetchAllProperties`, `saveProperty` (insert/update; el `slug` lo genera la DB y nunca cambia al editar), `setPropertyStatus`, `deleteProperty`, `uploadPropertyImage`, y para la bandeja de consultas `fetchContacts` (con la propiedad vinculada), `setContactStatus` y `deleteContact`. Todo pasa por el cliente autenticado, así que lo permitido lo definen las políticas RLS.

### 3.4 Flujo de una consulta (formularios de Contacto y "Solicitar información")

```
Visitante envía el formulario
   └─ sendContact()  (src/lib/contact.ts)  ── en paralelo e independientes ──┐
        ├─ submitContact()  → Supabase, tabla contacts (clave anon, solo INSERT por RLS)   [respaldo]
        └─ fetch POST /api/contact → Resend → email a VITE_CONTACT_EMAIL                   [aviso]
   └─ si AL MENOS UNO funcionó → trackFormSubmit() + pantalla de éxito
   └─ si fallaron AMBOS      → mensaje de error y NO se dispara form_submit
```

- **Datos del email:** nombre, email, teléfono, interés, propiedad (título y enlace) y mensaje. El `Reply-To` es el email del visitante, así que la inmobiliaria responde con "Responder".
- **Campo "interés":** solo existe en el formulario de la home. En la tabla `contacts` no tiene columna propia y se guarda al inicio del mensaje (por ejemplo `[Comprar una propiedad]`); en el email va como fila aparte.
- **Función `api/contact.ts`:** el destinatario sale únicamente de `VITE_CONTACT_EMAIL` (el endpoint no puede usarse para escribirle a terceros). Valida nombre y email, limita el largo de cada campo, rechaza enlaces que no sean `http(s)`, escapa el HTML y neutraliza saltos de línea en el asunto. Responde `503` si falta `RESEND_API_KEY` o `VITE_CONTACT_EMAIL`, `400` ante datos inválidos y `502` si Resend rechaza el envío.
- **Timeout:** el pedido al email se aborta a los 10 s para no dejar el formulario colgado.
- **Desarrollo local:** con `npm run dev` Vite no sirve la carpeta `api/`, por lo que `/api/contact` falla y la consulta se guarda solo en Supabase (el formulario igual confirma). Para probar el email en local hace falta ejecutar el proyecto con la CLI de Vercel (`vercel dev`) y las variables de entorno cargadas.
- **Anti-abuso:** el endpoint no tiene límite de frecuencia ni captcha. Es una mejora pendiente (ver 6.3).

---

## 4. Esquema de base de datos y Storage (Supabase)

Fuente: `supabase_schema.sql` (idempotente: se puede volver a ejecutar sin romper datos).

### 4.1 Tabla `public.properties`

| Columna | Tipo | Restricciones / default |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `title` | `text` | NOT NULL |
| `slug` | `text` | Único parcial (donde no es nulo ni vacío). Lo genera un trigger si viene vacío |
| `operation` | `text` | NOT NULL, CHECK en (`venta`, `alquiler`) |
| `property_type` | `text` | NOT NULL, CHECK en (`casa`, `departamento`, `terreno`, `local`, `ph`, `oficina`) |
| `price` | `numeric` | NOT NULL, default `0` (0 = "Consultar precio") |
| `currency` | `text` | NOT NULL, default `'USD'`, CHECK en (`USD`, `ARS`) |
| `location` | `text` | NOT NULL, default `''` |
| `address` | `text` | Nullable |
| `neighborhood` | `text` | NOT NULL, default `''` (filtro por barrio) |
| `city` | `text` | NOT NULL, default `''` |
| `bedrooms` | `int` | NOT NULL, default `0` |
| `bathrooms` | `int` | NOT NULL, default `0` |
| `covered_area` | `numeric` | Nullable (m² cubiertos) |
| `total_area` | `numeric` | NOT NULL, default `0` (m² totales) |
| `description` | `text` | NOT NULL, default `''` |
| `images` | `text[]` | NOT NULL, default `'{}'`. URLs públicas; **la primera es la portada** |
| `features` | `text[]` | NOT NULL, default `'{}'` |
| `parking` | `int` | NOT NULL, default `0` |
| `featured` | `boolean` | NOT NULL, default `false` (destacada en la home) |
| `badge` | `text` | Nullable (insignia de la tarjeta: "A estrenar", "En pozo") |
| `status` | `text` | NOT NULL, default `'disponible'`. CHECK en (`disponible`, `reservado`, `vendido`, `alquilado`), declarado `NOT VALID` (se exige en filas nuevas/editadas sin revalidar las antiguas) |
| `latitude` | `numeric` | Nullable. Latitud geográfica para el mapa en la ficha |
| `longitude` | `numeric` | Nullable. Longitud geográfica para el mapa en la ficha |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- **Índices:** `properties_created_at_idx` (`created_at desc`), `properties_status_idx` (`status`), `properties_slug_key` (único parcial sobre `slug`).
- **Trigger `properties_set_slug`** (`before insert or update of slug`): si `slug` está vacío, lo genera desde el título (minúsculas, sin tildes, guiones) + `-` + 8 primeros caracteres del `id`.
- **Migración in situ:** renombra las columnas antiguas `type` → `property_type` y `area` → `total_area` si existen, y normaliza nulos.
- **Regla de publicación:** el sitio público solo muestra `status = 'disponible'`.

### 4.2 Tabla `public.admins`

| Columna | Tipo | Restricciones |
|---|---|---|
| `user_id` | `uuid` | PK, FK → `auth.users(id)` `ON DELETE CASCADE` |

RLS activada **sin políticas**: la tabla no es legible por la API. Para dar de alta un admin: crear el usuario en Authentication → Users y ejecutar
`insert into public.admins (user_id) select id from auth.users where email = '…' on conflict do nothing;`

### 4.3 Función `public.is_admin()`

`SECURITY DEFINER`, `STABLE`, `search_path = public`: devuelve si `auth.uid()` está en `public.admins`. Permisos: `REVOKE` a `public` y `anon`, `GRANT EXECUTE` solo a `authenticated`. La usan tanto las políticas RLS como el RPC de `useAdminSession`.

### 4.4 Row Level Security

**`public.properties`** (RLS activada; `GRANT select` a `anon`; `GRANT select, insert, update, delete` a `authenticated`):

| Política | Operación | Roles | Condición |
|---|---|---|---|
| `Public read available` | SELECT | `anon`, `authenticated` | `status = 'disponible'` |
| `Admin read all` | SELECT | `authenticated` | `public.is_admin()` |
| `Admin insert` | INSERT | `authenticated` | `public.is_admin()` |
| `Admin update` | UPDATE | `authenticated` | `public.is_admin()` (using y with check) |
| `Admin delete` | DELETE | `authenticated` | `public.is_admin()` |

Resultado: el público ve solo propiedades disponibles; un usuario autenticado que **no** está en `admins` no puede escribir; el admin ve y modifica todos los estados.

**`storage.objects`** (solo bucket `property-images`):

| Política | Operación | Roles | Condición |
|---|---|---|---|
| `Admin upload property images` | INSERT | `authenticated` | `bucket_id = 'property-images' and public.is_admin()` |
| `Admin update property images` | UPDATE | `authenticated` | ídem (using y with check) |
| `Admin delete property images` | DELETE | `authenticated` | ídem |

No hay política de SELECT: el bucket es **público**, así que cada imagen se sirve por su URL pública, pero el listado de archivos no es consultable por la API.

### 4.4.1 Tabla `public.contacts` y sus políticas

| Columna | Tipo | Restricciones / default |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `name` | `text` | NOT NULL, CHECK 1 a 120 caracteres |
| `email` | `text` | NOT NULL, CHECK 3 a 254 caracteres y formato `_@_` |
| `phone` | `text` | Nullable, CHECK ≤ 40 caracteres |
| `message` | `text` | NOT NULL, default `''`, CHECK ≤ 4000 caracteres |
| `property_id` | `uuid` | Nullable, FK → `properties(id)` `ON DELETE SET NULL` (la consulta sobrevive si se borra la propiedad) |
| `status` | `text` | NOT NULL, default `'nuevo'`, CHECK en (`nuevo`, `leido`, `respondido`, `archivado`) |

Índices: `contacts_created_at_idx` (`created_at desc`) y `contacts_status_idx`. RLS activada; `GRANT insert` a `anon` y `GRANT select, insert, update, delete` a `authenticated`.

| Política | Operación | Roles | Condición |
|---|---|---|---|
| `Public insert contact` | INSERT | `anon`, `authenticated` | `status = 'nuevo'` (un visitante no puede crear una consulta con otro estado) |
| `Admin read contacts` | SELECT | `authenticated` | `public.is_admin()` |
| `Admin update contacts` | UPDATE | `authenticated` | `public.is_admin()` (using y with check) |
| `Admin delete contacts` | DELETE | `authenticated` | `public.is_admin()` |

Los visitantes **no tienen SELECT**: pueden dejar una consulta pero nunca leer las de otros. Los CHECK de largo son la defensa del lado de la base contra cargas enormes (la clave `anon` es pública).

### 4.5 Bucket `property-images`

| Parámetro | Valor |
|---|---|
| Visibilidad | Público (lectura por URL) |
| Tamaño máximo | 10 MB (10 485 760 bytes) |
| MIME permitidos | `image/jpeg`, `image/png`, `image/webp` |

### 4.6 Lógica de subida (`uploadPropertyImage` + `PhotoManager`)

1. El admin elige archivos o los arrastra a la zona de carga. Se suben en paralelo (`Promise.allSettled`): si uno falla, se muestra el motivo y los demás siguen.
2. Validación en cliente: extensión por MIME (`jpg`/`png`/`webp`) y máximo 10 MB. La misma restricción está impuesta en el bucket.
3. Se sube con nombre `crypto.randomUUID().ext`, `contentType` correcto y `cacheControl: 31536000` (1 año, el nombre es único por archivo).
4. Se obtiene la URL pública con `getPublicUrl()` y se agrega a la lista del formulario.
5. Miniaturas con **reordenamiento** (arrastrar o flechas ← →) y botón × para quitar. **La primera imagen es la portada** (marcada con la etiqueta "Portada"; si se reordena o borra, la portada pasa a ser la que quede primera).
6. Al guardar, se escribe el array de URLs en `properties.images`. El botón de guardar se bloquea mientras haya subidas en curso, y se exige al menos una foto.

**Compatibilidad:** las URLs ya existentes (de cualquier host, p. ej. las del catálogo original) se muestran y guardan tal cual; las 86 propiedades iniciales siguen funcionando sin migración.

**Limitación conocida:** quitar una foto en el formulario solo la desvincula de la propiedad; el archivo permanece en el bucket (evita borrar una imagen que otra propiedad pudiera usar).

---

## 5. Analítica y eventos

### 5.1 Identificadores

| Elemento | Variable | Estado en el repositorio |
|---|---|---|
| **GTM** | `VITE_GTM_ID` | El ID **no está en el código**: se lee de la variable de entorno (en `.env.example` figura el placeholder `GTM-XXXXXXX`; el valor real vive en Vercel). Sin un ID válido, el snippet no se ejecuta |
| **GA4** | `VITE_GA4_ID` | Tampoco hay ID en el código (placeholder `G-XXXXXXXXXX`). Si se define, `index.html` carga `gtag.js` directamente. Si GA4 se configura **dentro de GTM**, dejar la variable vacía |

**Lectura centralizada:** ambas variables se leen únicamente en `vite.config.ts` (plugin `trevisan-analytics`), que valida el formato (`GTM-…` / `G-…`) y las inyecta en `index.html` como `%VITE_GTM_ID%` y `%VITE_GA4_ID%`. Ningún componente accede a ellas. Un valor inválido se descarta con un aviso en el build.

> Elegir **un solo** camino para GA4. Con `VITE_GA4_ID` definido **y** una etiqueta de GA4 en el contenedor GTM, cada evento se contaría dos veces.

Para completar este punto, agregar acá el ID real de GTM (y de GA4 si corresponde) una vez confirmados.

### 5.2 Mecanismo (`src/lib/analytics.ts`)

Cada evento se empuja a `window.dataLayer` (se crea si no existe, por lo que no se pierden eventos aunque GTM cargue después). Si el snippet de GA4 directo está activo (`window.gtag` definido), el mismo evento se replica con `gtag('event', …)`; los parámetros anidados (como `filters`) se envían como JSON porque GA4 solo admite valores planos. En desarrollo (`import.meta.env.DEV`) también se loguea en consola con el prefijo `[analytics]`.

### 5.3 Eventos personalizados

| Evento | Parámetros | Dónde se dispara |
|---|---|---|
| `whatsapp_click` | `property_slug`, `property_title`, `page_path` | **Detalle de propiedad** (`PropertyDetailPage`): botón de WhatsApp, con slug y título reales. **Navbar** (enlace de escritorio y de móvil): `'navbar'` / `'Navbar'`. **Footer** (2 enlaces): `'footer'` / `'Footer'`. **Sección Contacto** (`ContactSection`): `'contacto'` / `'Contacto general'` |
| `form_submit` | `form_id: 'contact'`, `page_path` | Cuando una consulta **se registra con éxito** (se guardó en Supabase o se envió el email) desde la **sección Contacto** (home) o el formulario del **detalle de propiedad**. Ya no se dispara si fallan ambos canales. Ambos formularios usan el mismo `form_id`; se distinguen por `page_path` |
| `property_search` | `filters` (solo los activos), `filters_count` | Búsqueda del **Hero** (operación, tipo, barrio) y botón Buscar de **`/propiedades`** (operación, tipo, barrio, precio mín./máx., moneda, dormitorios) |

### 5.4 Observaciones para quien administre GTM

- Todos los enlaces de WhatsApp del sitio disparan `whatsapp_click`; se distinguen por `property_slug` (`navbar`, `footer`, `contacto` o el slug de la propiedad).
- Los formularios de contacto ya persisten los datos (tabla `contacts`) y avisan por email; `form_submit` es una medición del lead, no el registro del lead.
- Como `form_id` es `'contact'` en ambos formularios, conviene segmentar por `page_path` en GTM/GA4.

---

## 6. Estrategia de performance y UX

### 6.1 Métricas de bundle (`npm run build`, Vite 8.3.5, 2498 módulos)

| Archivo | Tamaño | Gzip | Carga |
|---|---|---|---|
| `index-*.js` (código de la app) | 284.69 kB | 87.81 kB | Inicial |
| `useProperties-*.js` | 142.00 kB | 47.94 kB | Inicial (modulepreload) |
| `Skeleton-*.js` (compartido: router, React, `Intl`) | 51.81 kB | 18.54 kB | Inicial (modulepreload) |
| `rolldown-runtime-*.js` | 0.59 kB | 0.36 kB | Inicial (modulepreload) |
| `index-*.css` | 57.33 kB | 10.71 kB | Inicial |
| `gsap-*.js` (GSAP + ScrollTrigger) | 119.98 kB | 47.26 kB | Diferida (`import()`) |
| `smoothScroll-*.js` (Lenis) | 19.01 kB | 5.54 kB | Diferida, solo escritorio |
| `AdminPage-*.js` | 28.87 kB | 8.56 kB | Diferida, solo en `/admin` |
| `PropertyDetailPage-*.js` | 17.86 kB | 5.53 kB | Diferida (prefetch a 1.5 s) |
| `ListingsPage-*.js` | 11.13 kB | 3.57 kB | Diferida (prefetch a 1.5 s) |
| `PropertyCard-*.js` | 6.90 kB | 2.72 kB | Compartida por las páginas diferidas |
| `index.html` | 3.63 kB | 1.52 kB | Inicial |

**Carga inicial (suma):** JS ≈ 479 kB (≈ 155 kB gzip) + CSS 57.3 kB (10.7 kB gzip). El chunk de GSAP (120 kB) no forma parte de la carga inicial. Frente a la medición anterior, el cambio es mínimo (+2 kB de JS): la lógica de consultas va en los chunks diferidos y el panel de consultas, dentro de `AdminPage`. La función `api/contact.ts` corre en el servidor y no pesa en el bundle.

### 6.2 Optimizaciones

**Code splitting y carga diferida**
- `ListingsPage`, `PropertyDetailPage` y `AdminPage` con `React.lazy`. Listado y detalle se precargan 1.5 s después del primer render para que la navegación y la transición tarjeta → detalle no esperen a la red. **El admin nunca se precarga.**
- Supabase SDK, GSAP/ScrollTrigger y Lenis se cargan con `import()` dinámico.
- Lenis solo se monta con puntero fino (`hover: hover` y `pointer: fine`) y sin `prefers-reduced-motion`; en táctiles se usa el scroll nativo.
- Un único bucle `requestAnimationFrame`: Lenis corre sobre el ticker de GSAP.

**Datos**
- Una sola request compartida para todos los componentes de la home y el catálogo, iniciada al evaluarse el bundle.
- Detalle instantáneo si la propiedad ya está en memoria.
- Timeout de 8 s con estado de error y reintento (`LoadError`).

**Skeletons y estados de carga** (`components/ui/Skeleton.tsx`): `Skeleton`, `PropertyCardSkeleton`, `PropertyGridSkeleton` (6 por defecto), `PropertyDetailSkeleton`; se usan en destacadas, categorías, catálogo, detalle y admin. Sin saltos de layout (las tarjetas reservan relación de aspecto 4:3).

**Imágenes**
- `loading="lazy"` y `decoding="async"` en tarjetas, secciones de la home, galería del detalle y miniaturas del admin.
- Hero: `fetchPriority="high"` en la imagen principal.
- Archivos subidos al Storage con caché de 1 año; `/assets/*.js|css` con `Cache-Control: public, max-age=31536000, immutable` (`vercel.json`).
- Las partículas del hero se pausan cuando salen de pantalla (`IntersectionObserver`).

**Formato de números (`data/properties.ts`)**
- Un único `Intl.NumberFormat('es-AR')` instanciado una vez (reutilizado en cada render) → `1234567` se muestra como `1.234.567`.
- `formatAmount`: `USD 600.000` / `$ 29.239.492`. `formatPrice`: `Consultar precio` si el precio es 0; sufijo `/mes` en alquileres.

**UX y accesibilidad**
- Transiciones de página con `AnimatePresence mode="wait"`; la tarjeta se anima hacia el detalle con `layoutId`.
- Filtros reflejados en la URL (enlaces compartibles); propiedades con precio 0 se mantienen en búsquedas por rango para que puedan coincidir por otros criterios.
- Botón "Compartir" (copia el enlace), Lightbox de galería, roles ARIA (`role="dialog"`, `role="status"`, `role="alert"`, `role="tab"`) en admin y formularios; cierre del modal con Escape.
- `/admin` fuera de buscadores (`noindex, nofollow`).

### 6.3 Oportunidades de mejora (no implementadas)

- Las imágenes del hero y del catálogo original se sirven a resolución completa; no hay `srcset` ni redimensionado en el servidor (Supabase Storage admite transformaciones en planes que las incluyan).
- El chunk `index-*.js` (285 kB) concentra gran parte del peso inicial; revisar qué parte de framer-motion y de la home podría diferirse.
- Resolver los 3 warnings de lint existentes (ver sección 8).
- Proteger `/api/contact` y el INSERT público de `contacts` contra spam (captcha o límite de frecuencia): hoy solo hay validación y límites de largo.
- Verificar un dominio propio en Resend y definir `RESEND_FROM`; con el remitente de prueba los correos solo llegan a la casilla del dueño de la cuenta de Resend.
- Integrar un CRM o notificación adicional (por ejemplo WhatsApp) si el volumen de consultas lo justifica.

---

## 7. Despliegue y operación

1. **Supabase:** ejecutar `supabase_schema.sql` (crea `properties`, `admins`, `contacts`, RLS y bucket; se puede volver a ejecutar) y luego `supabase_seed.sql` en el SQL Editor. Crear el usuario admin (Authentication → Users, *Auto Confirm*) y darlo de alta en `public.admins`.
2. **Resend:** crear una cuenta, generar una API key y, para enviar a la casilla real de la inmobiliaria, verificar un dominio.
3. **Vercel:** definir `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GTM_ID` y/o `VITE_GA4_ID`, `VITE_CONTACT_EMAIL`, `RESEND_API_KEY` y, si hay dominio verificado, `RESEND_FROM`. Build: `npm run build`; salida: `dist`. Las `VITE_*` requieren redeploy al cambiarlas.
4. **Publicar / pausar una propiedad:** desde `/admin` → Propiedades, cambiar el estado. Solo `disponible` aparece en el sitio.
5. **Atender consultas:** llegan por email y quedan en `/admin` → Consultas, donde se marcan como leído / respondido / archivado.
6. **Si el email no está configurado**, el sitio sigue funcionando: la consulta se guarda en Supabase y el visitante ve la confirmación (el aviso por email simplemente no se envía).
7. **Seguridad:** la clave `anon` es pública por diseño; toda escritura está protegida por RLS + `is_admin()`. La `RESEND_API_KEY` es secreta y nunca debe tener prefijo `VITE_`. No incluir nunca la `service_role` en el front.

---

## 8. Estado de verificación y pendientes

**Verificado** (sobre el commit `a81ddc7`)

| Qué | Cómo |
|---|---|
| Compila y tipa | `npm run build` (`tsc -b && vite build`) sin errores, incluyendo `api/contact.ts` |
| Lint | `npm run lint`: 0 errores y 3 warnings preexistentes (`react/purity` en `Footer.tsx`; `react/set-state-in-effect` en `Navbar.tsx` y `ListingsPage.tsx`) |
| IDs de analítica | Build con IDs válidos, vacíos e inválidos: se inyectan, se omiten o se ignoran con aviso, según corresponda |
| Función `api/contact.ts` | Probada con un `fetch` simulado: respuesta 200, destinatario y `Reply-To`, escape de HTML, y errores 400 (email, nombre, JSON, enlace), 502 (Resend rechaza) y 503 (sin clave) |
| Secretos | Ninguna referencia a `RESEND_API_KEY`, `api.resend.com` ni `CONTACT_EMAIL` en `dist/` |

**No verificado** (requiere el entorno real; no se probó de punta a punta)

- Envío real de un email con Resend (cuenta, API key y dominio del cliente).
- Que las políticas RLS de `contacts` funcionen contra el proyecto de Supabase real (el SQL se escribió y se revisó, pero esta tabla no fue ejecutada ni probada allí por quien documenta).
- El formulario de la home y el de la ficha enviando contra Supabase y contra `/api/contact` ya desplegados.
- La pestaña **Consultas** del admin con datos reales.
- Que el rewrite de `vercel.json` (`/((?!api/).*)`) deje pasar `/api/contact` en el despliegue real de Vercel.

**Pendientes conocidos**

- Variables de entorno en Vercel: `VITE_CONTACT_EMAIL`, `RESEND_API_KEY` y, con dominio verificado, `RESEND_FROM`; más `VITE_GTM_ID` y/o `VITE_GA4_ID`.
- Ejecutar de nuevo `supabase_schema.sql` en Supabase para agregar las columnas `latitude` y `longitude` a `public.properties` (el script es idempotente: `ADD COLUMN IF NOT EXISTS`).
- Protección anti-spam en `/api/contact` y en el INSERT público de `contacts`.
- IDs reales de GTM y GA4 (esta documentación solo registra los placeholders).
