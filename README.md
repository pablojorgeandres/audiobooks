# Audiolibros

Aplicación PWA para escuchar audiolibros.

## Características

- Lista de libros disponibles
- Reproductor de audio con controles de play/pausa
- Velocidad de reproducción: 0.5x, 1x, 1.5x, 2x
- Avance automático al siguiente capítulo
- Guardado de progreso (libro, capítulo, tiempo, velocidad)
- Interfaz en español, tema oscuro
- Instalable como PWA

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

- `public/catalog.json` - Catálogo de libros y capítulos
- `app/api/audio/[fileId]` - Proxy de audio desde Google Drive
- `app/book/[bookId]` - Página del libro con reproductor
