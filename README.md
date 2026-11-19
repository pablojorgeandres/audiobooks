# Audiolibros

Aplicación PWA para escuchar audiolibros.

## Características

- Lista de libros disponibles
- Reproductor de audio con controles de play/pausa
- Velocidad de reproducción: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Avance automático al siguiente capítulo
- Guardado de progreso (libro, capítulo, tiempo, velocidad)
- Interfaz en español, tema oscuro
- Instalable como PWA
- Auto-descubrimiento de capítulos desde Google Drive

## Libros disponibles

- Filocalia - Nicodemo y Macario
- El ciclo de las lunaciones - Dane Rudhyar
- El Kybalion - Tres Iniciados
- El misterio de Belicena Villca - Nimrod de Rosario

## Tecnología

- Next.js 14 (App Router)
- TypeScript
- API de proxy para audio desde Google Drive

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
npm start
```

## Estructura

- `public/catalog.json` - Catálogo de libros y capítulos (fallback)
- `app/api/audio/[fileId]` - Proxy de audio desde Google Drive
- `app/api/books/[bookId]/chapters` - API de capítulos con auto-descubrimiento
- `app/book/[bookId]` - Página del libro con reproductor

## Configuración opcional: Auto-descubrimiento de capítulos

La aplicación puede descubrir automáticamente nuevos capítulos desde Google Drive sin necesidad de modificar el código ni hacer un nuevo deploy.

### Variable de entorno

- `GOOGLE_DRIVE_API_KEY` - API key de Google Cloud con acceso a la API de Google Drive

### Configuración

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar la API de Google Drive
3. Crear una API key (Credenciales → Crear credenciales → Clave de API)
4. Configurar la variable de entorno en Vercel:
   - Ir a Settings → Environment Variables
   - Agregar `GOOGLE_DRIVE_API_KEY` con el valor de la API key
5. Asegurar que las carpetas de Google Drive estén compartidas como "Cualquier persona con el enlace"

### Comportamiento

- **Con API key configurada**: Los capítulos se descubren automáticamente desde la carpeta de Drive de cada libro. Los nuevos capítulos aparecen en ~10 minutos (caché de 600 segundos).
- **Sin API key o error de Drive**: Se usan los capítulos del catálogo estático (`public/catalog.json`) como fallback.
- **Regla de merge**: Nunca se muestran menos capítulos que los del catálogo estático. Si Drive tiene más capítulos, se agregan; si hay conflicto, el fileId de Drive tiene prioridad.
