# Thinkion Base Template — Contexto para Claude Code

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend + Backend | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui (@base-ui/react) |
| Base de datos | PostgreSQL vía Supabase |
| ORM | Prisma |
| Autenticación | Supabase Auth + Google OAuth (dominio corporativo) |
| Storage | Supabase Storage (PDFs, archivos) |
| PDF | @react-pdf/renderer (serverless nativo, sin browser) |
| Email | Resend |
| Hosting | Vercel (región gru1 — São Paulo, misma que Supabase) |
| HubSpot | `@hubspot/api-client` |
| Jira | REST API v3 con Basic Auth |
| Google Sheets | `googleapis` + Service Account |

## Convenciones

- **Idioma del código**: inglés (variables, funciones, tipos, comentarios)
- **Idioma de la UI**: español
- **Idioma del chat**: español
- **Formato fechas en UI**: `DD/MM/YYYY HH:mm` (formato argentino, GMT-3)
- **Moneda**: `$` para ARS, `US$` para USD. Miles con `.`, decimales con `,`
- **Estados en BD**: en inglés (`draft`, `pending`, etc.)
- **Variables sensibles**: SOLO en `.env.local` (local) o Vercel env vars (producción). JAMÁS en código ni commits.
- **Service Account JSON**: nunca commitear. Está en `.gitignore` (`*service-account*.json`)
- **Commits**: en inglés, formato `Phase N - <qué se hizo>`

## Roles

| Rol | Descripción |
|-----|-------------|
| `VIEWER` | Solo lectura |
| `EJECUTIVO` | Usuario operativo estándar |
| `SUPERVISOR` | Puede aprobar acciones |
| `FACTURACION` | Acceso restringido a módulo de facturación |
| `ADMIN` | Acceso total, no puede ser restringido vía permisos |

## CRÍTICO: GRANTs Supabase en cada migración

Toda tabla nueva debe incluir estos statements en la migración:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nueva_tabla TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nueva_tabla TO service_role;
ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;
```

Sin esto, Prisma no puede leer/escribir la tabla desde las rutas API de Vercel
(que usan el service role key). Esto ocurre porque Supabase activa RLS por defecto
en todas las tablas y el service role necesita grants explícitos en el pooler.

## Patrones importantes

### getDbUser()
Función cacheable con dos capas: `React.cache()` (deduplicación por request) + `unstable_cache()` (TTL 5 min). Usar siempre en server components y actions en lugar de consultar el user directo. Redirige a `/login` o `/unauthorized` automáticamente.

### Permisos granulares
Usar `hasPermission(user, module, action)` en lugar de `user.role === "X"`. El sistema evalúa: ADMIN → override del usuario → default del rol. Agregar nuevos módulos al enum `PermissionModule` en schema.prisma y a las constantes de `permissions.ts`.

### HubSpot: búsqueda de deals
Usar el campo `query` de nivel superior en `doSearch()`, NO `CONTAINS_TOKEN`. El campo `query` soporta búsquedas por fracciones de palabra (ej: "pru" encuentra "Prueba").

### Google Sheets: private key en Vercel
La `GOOGLE_PRIVATE_KEY` debe guardarse entre comillas externas en Vercel, el código usa `.replace(/^"|"$/g, "")` para eliminarlas.

### Fire-and-forget en Vercel
En Vercel, las promesas sin `await` mueren cuando retorna la respuesta HTTP. Para tareas asíncronas post-response usar `after()` de `next/server`.

### Fechas
Usar siempre funciones de `src/lib/dates.ts` (no `toLocaleDateString` directo) para garantizar GMT-3 en servidor y cliente.

### PDF con @react-pdf/renderer
Registrar fuentes con `Font.register()` usando `nodePath.join(process.cwd(), "public/fonts/...")`. Renderizar con `renderToBuffer()` en route handlers, no en Server Components.

## Comandos clave

```bash
npm run dev          # Servidor de desarrollo en localhost:3000
npm run build        # Build de producción
npm run lint         # ESLint
npm run db:migrate   # Nueva migración (requiere .env.local)
npm run db:studio    # GUI para ver/editar la BD
npm run db:generate  # Regenerar Prisma Client después de cambiar schema
```

## Variables de entorno principales

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server-side) |
| `DATABASE_URL` | Connection string Prisma — Transaction mode, puerto 6543 |
| `DIRECT_URL` | Connection string directa — para migraciones, puerto 5432 |
| `NEXT_PUBLIC_APP_URL` | URL base de la app |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM_EMAIL` | Dirección remitente |
| `HUBSPOT_ACCESS_TOKEN` | Token de la Private App de HubSpot |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la Service Account |
| `GOOGLE_PRIVATE_KEY` | Private key (con comillas externas en Vercel) |
| `JIRA_BASE_URL` | URL base de Jira |
| `JIRA_EMAIL` | Email de la cuenta Jira |
| `JIRA_API_TOKEN` | API token de Jira |

## Reglas de colaboración

- Explicar qué se va a hacer antes de ejecutar comandos o modificar archivos.
- Avisar si un comando va a tardar.
- Si se detecta un problema de seguridad, performance o pérdida de datos: parar y discutir.
- Commits frecuentes con mensajes claros en inglés.
- NUNCA commitear `.env.local` ni archivos de service account.
