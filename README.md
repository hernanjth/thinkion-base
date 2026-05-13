# thinkion-base

Template base para proyectos internos de Thinkion. Incluye autenticación completa, layout con sidebar, sistema de permisos por rol, emails transaccionales e integraciones pre-configuradas con HubSpot, Jira y Google Sheets.

## Qué incluye

- **Auth completa**: Google OAuth restringido a dominio corporativo, sistema de invitaciones por link, callback con creación de usuario en DB, página `/unauthorized`
- **Layout con sidebar**: sidebar oscuro colapsable, navegación con indicador de carga, overlay de transición, soporte mobile
- **Sistema de permisos**: 5 roles (VIEWER, EJECUTIVO, SUPERVISOR, FACTURACION, ADMIN), overrides granulares por usuario, `hasPermission()` para server actions y páginas
- **Gestión de usuarios**: página `/admin/usuarios` con tabla de usuarios, invitaciones pendientes con revocación
- **PDF base**: template con branding Thinkion (header violeta + logo + fuentes Outfit), función `generatePdf()` + `uploadPdfToStorage()`
- **Email**: `sendEmail()` genérico + `sendInvitationEmail()` pre-armada, logging a BD, template HTML con branding
- **Utilidades**: `dates.ts` (GMT-3), `audit.ts`, `settings.ts` (cacheable), `webhook-utils.ts`, `sheets.ts` (export a Google Sheets), stubs de HubSpot y Jira con JSDoc completo
- **Performance**: `React.cache()` + `unstable_cache()` en `getDbUser()`, `staleTimes.dynamic: 0`, NProgress bar

## Cómo arrancar

### 1. Clonar y dependencias

```bash
git clone https://github.com/thinkion/thinkion-base.git mi-nuevo-proyecto
cd mi-nuevo-proyecto
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
# Editá .env.local con tus valores reales
```

Variables mínimas para arrancar:
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — del dashboard de Supabase
- `DATABASE_URL` y `DIRECT_URL` — connection strings de Supabase
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` para desarrollo

### 3. Configurar Supabase Auth

En el dashboard de Supabase:
1. Authentication → Providers → Google → habilitar
2. Agregar Client ID y Secret de Google Cloud Console
3. En Redirect URLs agregar: `http://localhost:3000/auth/callback`
4. En Google Cloud Console → OAuth → Authorized redirect URIs: `https://[tu-proyecto].supabase.co/auth/v1/callback`

### 4. Migrar la base de datos

```bash
npm run db:migrate
# Cuando pida nombre, escribí algo como "init"
```

> IMPORTANTE: Después de migrar, ejecutar los GRANTs en Supabase SQL Editor:
> ```sql
> GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
> GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
> ```

### 5. Crear el primer usuario admin

Después de correr el servidor, loguearte una vez con Google. Luego en Supabase SQL Editor:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'tu@email.com';
```

### 6. Correr el servidor

```bash
npm run dev
# → http://localhost:3000
```

## Qué personalizar para un proyecto nuevo

| Archivo | Qué cambiar |
|---------|-------------|
| `src/app/login/page.tsx` | Nombre de la app en el título |
| `src/app/login/actions.ts` | `ALLOWED_DOMAIN` |
| `src/app/auth/callback/route.ts` | `ALLOWED_DOMAIN` y `HOME_ROUTE` |
| `src/app/invite/[token]/page.tsx` | `APP_NAME` |
| `src/app/invite/[token]/actions.ts` | `ALLOWED_DOMAIN` |
| `src/app/(app)/admin/usuarios/actions.ts` | `ALLOWED_DOMAIN` |
| `src/components/layout/sidebar.tsx` | `ALL_NAV_ITEMS` — agregar rutas del proyecto |
| `src/app/layout.tsx` | `metadata.title` y `metadata.description` |
| `prisma/schema.prisma` | Agregar modelos y enums del dominio |
| `src/lib/permissions.ts` | `PERMISSION_MODULES`, `ROLE_DEFAULTS` |

## Hacer el repo template en GitHub

1. Ir a Settings → General → Template repository → checkbox
2. Al crear un nuevo proyecto: "Use this template" en lugar de "Fork"

## Estructura del proyecto

```
src/
  app/           # Rutas (App Router)
    (app)/       # Rutas autenticadas (layout con sidebar)
    auth/        # Callback de OAuth
    invite/      # Flujo de invitaciones
    login/       # Página de login
    unauthorized/
  components/
    layout/      # AppShell, Sidebar, PageHeader, Topbar
    pdf/         # Template base de PDF
    ui/          # Componentes shadcn (Button, Avatar, Spinner, etc.)
  hooks/         # useNavigation
  lib/           # Utilidades y clientes de servicios
    supabase/    # client.ts + server.ts
prisma/
  schema.prisma  # Schema base — extender con modelos del proyecto
public/
  fonts/         # Outfit TTF (para PDFs)
  logo.svg       # Logo Thinkion
  logo-symbol.svg
```

## Variables de entorno requeridas

Ver `.env.local.example` para la lista completa con descripciones.
