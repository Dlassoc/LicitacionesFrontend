# LicitacionesFrontend

Frontend de la plataforma de licitaciones construido con React + Vite.
Permite autenticacion de usuarios, busqueda de procesos (SECOP), analisis asistido, gestion de licitaciones excluidas y vistas de preferencias.

## Stack tecnico

- React 19
- Vite 7
- React Router DOM 7
- Tailwind CSS 3
- ESLint 9

## Requisitos

- Node.js 18 o superior (recomendado Node.js 20 LTS)
- npm 9 o superior
- Backend levantado y accesible (ver carpeta `LicitacionesBackend`)

## Instalacion

```bash
npm install
```

## Variables de entorno

Este proyecto usa Vite, por lo que las variables deben iniciar con `VITE_`.

1. Crea un archivo `.env` en la raiz del frontend.
2. Usa este contenido como base:

```env
VITE_API_BASE_URL=https://backendlicitaciones.emergente.com.co
VITE_ENABLE_LIVE_AUTO_ANALYSIS=false
# VITE_API_BASE_URL=http://localhost:5000
# VITE_ENABLE_LIVE_AUTO_ANALYSIS=true
```

Variable usada:

- `VITE_API_BASE_URL`: URL base del backend.
- `VITE_ENABLE_LIVE_AUTO_ANALYSIS`: habilita (`true`) o deshabilita (`false`) el autoanalisis en vivo desde frontend. Si esta en `false`, el analisis queda solo para procesos programados (ej. 4 AM).

## Scripts disponibles

```bash
npm run dev      # Desarrollo local
npm run build    # Build de produccion
npm run preview  # Preview del build
npm run lint     # Lint del proyecto
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Vite mostrara una URL local (normalmente `http://localhost:5173`).

## Build de produccion

```bash
npm run build
npm run preview
```

El resultado queda en `dist/`.

## Rutas principales

Definidas en `src/root.jsx`:

- `/login`: inicio de sesion
- `/register`: registro de usuario
- `/app`: vista principal protegida
- `/app/preferences`: preferencias del usuario
- `/app/saved`: licitaciones excluidas

## Estructura base

```text
src/
  app/
    App.jsx
  auth/
    AuthContext.jsx
    ProtectedRoute.jsx
  components/
  config/
    api.js
  features/
  hooks/
  layout/
    RootLayout.jsx
  pages/
    Login.jsx
    Register.jsx
    PreferencesPage.jsx
    SavedLicitacionesPage.jsx
```

## Integracion con backend

La app consume endpoints de autenticacion, busqueda SECOP, analisis y suscripciones desde `src/config/api.js`.

Puntos importantes:

- Se usan cookies (`credentials: include`) para sesion.
- El backend debe permitir CORS con credenciales para el dominio del frontend.

## Solucion de problemas

- Error de login/sesion: verifica que `VITE_API_BASE_URL` apunte al backend correcto y que exista conectividad.
- Errores de CORS: valida configuracion de origenes permitidos y credenciales en backend.
- Pantalla sin datos: revisa logs del navegador y disponibilidad de endpoints (`/secop/buscar`, `/auth/me`, etc.).

## Notas

- `main.jsx` imprime en consola la URL de API cargada para facilitar verificacion de entorno.
- Si cambias variables `.env`, reinicia el servidor de Vite.
