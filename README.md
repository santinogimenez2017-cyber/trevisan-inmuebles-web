# Trevisan Inmuebles

Sitio web y catálogo de propiedades de **Trevisan Inmuebles** (Roque González 1137, Posadas, Misiones, Argentina): casas, departamentos, terrenos, locales, PH y oficinas en venta y alquiler. Incluye un panel de administración (`/admin`) para gestionar propiedades, fotos y consultas recibidas.

## Arquitectura

SPA estática con backend gestionado. El único código de servidor propio es una función serverless (`api/contact.ts`) que envía el email de cada consulta.

```
Navegador (React SPA, Vercel)
   │  clave pública "anon"                      POST /api/contact
   ▼                                                   ▼
Supabase ── PostgreSQL (properties, contacts, admins)   Función serverless (Vercel) ──► Resend ──► casilla de la inmobiliaria
         ├─ Auth      (login del panel /admin)          (la API key de Resend vive solo aquí)
         └─ Storage   (bucket público `property-images`)
```

Cada consulta se guarda en la tabla `contacts` (respaldo, visible en `/admin`) **y** se envía por email, en paralelo. El visitante ve la confirmación si al menos uno de los dos canales funcionó.

| Capa | Tecnología |
|---|---|
| UI | React 19, React Router 7 |
| Build | Vite 8, TypeScript 7 |
| Estilos | Tailwind CSS 4 |
| Animación | Framer Motion (transiciones), GSAP + ScrollTrigger (hero), Lenis (scroll suave, solo escritorio) |
| Datos / Auth / Storage | Supabase (`@supabase/supabase-js`) |
| Email transaccional | Resend, vía función serverless de Vercel (`api/contact.ts`) |
| Analítica | Google Tag Manager y Google Analytics 4 |
| Lint | Oxlint |
| Hosting | Vercel (rewrite SPA a `index.html`, ver `vercel.json`) |

**Decisiones clave**

- **La seguridad vive en la base de datos.** La clave `anon` es pública, así que todo permiso se define con Row Level Security y la función `public.is_admin()` (`supabase_schema.sql`). Ocultar botones en la UI no protege nada.
- **Dos clientes de Supabase** (`src/lib/supabase.ts`): el público no guarda sesión (siempre `anon`); el del admin la persiste para que las escrituras lleven el JWT del usuario.
- **Rendimiento:** el SDK de Supabase, GSAP y Lenis se cargan con `import()` dinámico; listado, detalle y admin son chunks separados con `React.lazy`.
- **Una sola request de listado**, compartida por todos los componentes (`useProperties`).

## Puesta en marcha

Requisitos: Node.js 20+ y un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
# completar .env.local (ver "Variables de entorno")
npm run dev                     # http://localhost:5173
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | `tsc -b` (chequeo de tipos) + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente |
| `npm run lint` | Oxlint |

### Configurar Supabase (una sola vez)

1. En **SQL Editor** ejecutá [`supabase_schema.sql`](supabase_schema.sql): crea las tablas `properties`, `admins` y `contacts`, las políticas RLS, el trigger de slug y el bucket `property-images`. Es idempotente: se puede volver a ejecutar.
2. Ejecutá [`supabase_seed.sql`](supabase_seed.sql) para cargar el catálogo inicial (86 propiedades).
3. En **Authentication → Users** creá un usuario (email + contraseña, *Auto Confirm*) y dalo de alta como administrador:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu@email.com'
   on conflict do nothing;
   ```
4. Copiá la URL del proyecto y la clave **anon** (Project Settings → API) a `.env.local`.

## Variables de entorno

Se leen en **build time**: tras cambiarlas en Vercel hay que volver a desplegar. Plantilla en [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto (`https://<ref>.supabase.co`). Se tolera el sufijo `/rest/v1` |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública *anon*. **Nunca** usar la `service_role` |
| `VITE_GTM_ID` | No | Contenedor de Google Tag Manager (`GTM-XXXXXXX`) |
| `VITE_GA4_ID` | No | ID de medición de GA4 (`G-XXXXXXXXXX`), cargado con gtag.js |
| `VITE_CONTACT_EMAIL` | Para el email | Casilla de la inmobiliaria que recibe cada consulta. La lee solo `api/contact.ts` (servidor) |
| `RESEND_API_KEY` | Para el email | Clave de [Resend](https://resend.com). **Secreta**: sin prefijo `VITE_`, solo en el servidor |
| `RESEND_FROM` | No | Remitente con dominio verificado en Resend. Por defecto `onboarding@resend.dev`, que solo entrega a la casilla del dueño de la cuenta |

Si faltan `VITE_CONTACT_EMAIL` o `RESEND_API_KEY`, el sitio sigue funcionando: la consulta se guarda en Supabase y solo se omite el email.

Los IDs de analítica se leen **solo** en [`vite.config.ts`](vite.config.ts), se validan por formato y se inyectan en `index.html`. Si falta o tiene formato inválido, ese snippet simplemente no se carga (con aviso en el build).

> Si GA4 ya está configurado dentro del contenedor de GTM, dejá `VITE_GA4_ID` vacío: de lo contrario cada evento se cuenta dos veces.

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Pública | Home: hero con buscador, destacadas, categorías, nosotros, contacto |
| `/propiedades` | Pública | Catálogo con filtros (`operacion`, `tipo`, `barrio`, `minPrecio`, `maxPrecio`, `moneda`, `dormitorios`) |
| `/propiedad/:slug` | Pública | Ficha: galería, WhatsApp, formulario "Solicitar información" |
| `/admin` | **Protegida** | Panel: pestaña *Propiedades* (alta/edición con subida de fotos, estado, borrado) y pestaña *Consultas* (mensajes recibidos) |
| `*` | Pública | Página 404 |
| `POST /api/contact` | Endpoint | Función serverless que envía el email de la consulta (no es una página de la SPA) |

`/admin` exige iniciar sesión **y** estar en la tabla `public.admins`; además se marca `noindex, nofollow`.

## Modelo de datos

| Tabla | Para qué | Acceso |
|---|---|---|
| `properties` | Catálogo. Solo `status = 'disponible'` se muestra en el sitio | Lectura pública de disponibles; todo lo demás, solo admins |
| `contacts` | Consultas de los formularios (`name`, `email`, `phone`, `message`, `property_id` opcional, `status`) | Los visitantes solo pueden **insertar**; leer, cambiar estado y borrar, solo admins |
| `admins` | Usuarios autorizados para el panel | No legible por la API |
| Storage `property-images` | Fotos (JPG/PNG/WEBP, máx. 10 MB) | Lectura pública por URL; subir/borrar, solo admins |

## Analítica

Los eventos se publican en `window.dataLayer` (y se replican con `gtag` si hay GA4 directo). Definidos en [`src/lib/analytics.ts`](src/lib/analytics.ts):

| Evento | Se dispara cuando… |
|---|---|
| `whatsapp_click` | Se hace clic en un enlace de WhatsApp (Navbar, ficha de propiedad, Footer, sección Contacto) |
| `form_submit` | Una consulta se guarda con éxito (home o ficha de propiedad) |
| `property_search` | Se usa el buscador del hero o el botón Buscar de `/propiedades` |

## Estructura de `src/`

```
src/
├── components/   hero, layout (Navbar, Footer…), property (tarjeta, lightbox), sections (home), ui
├── data/         tipos y utilidades de propiedades, datos de contacto
├── hooks/        useProperties, useNeighborhoods, usePropertyBySlug
├── lib/          supabase, analytics, scroll, GSAP/Lenis
└── pages/        Home, Listings, PropertyDetail, NotFound y admin/
```

## Despliegue

1. Importar el repositorio en Vercel (framework Vite; `vercel.json` ya define build, salida y rewrites).
2. Cargar las variables de entorno de la tabla anterior.
3. Desplegar. Cada push a `main` genera un nuevo deploy.
