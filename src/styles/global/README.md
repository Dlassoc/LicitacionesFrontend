# Estilos Globales

Esta carpeta contiene los estilos globales que se aplican a toda la aplicación.

## Archivos

- **fonts.css** - Define las fuentes personalizadas (@font-face) y utilidades de tipo de letra
- **header.css** - Estilos del header/navbar (requiere Tailwind @apply)
- **theme.css** - Sistema de temas (claro/oscuro) usando variables CSS y selectores data-theme

## Importación

Estos estilos se importan en:
- `main.jsx` - theme.css se importa globalmente
- `Header.jsx` - header.css se importa en el componente
- `ThemeToggle.jsx` - theme.css se importa para consistencia de tema

## Notas

Los archivos con `@apply` de Tailwind necesitan que Tailwind esté disponible en el proyecto.
