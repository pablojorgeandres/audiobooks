'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Chapter {
  number: number
  title: string
  fileId: string
}

interface Book {
  id: string
  title: string
  folderId: string
  chapters: Chapter[]
}

interface Catalog {
  books: Book[]
}

interface Progress {
  bookId: string
  chapterIndex: number
  currentTime: number
  playbackRate: number
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [progress, setProgress] = useState<Record<string, Progress>>({})

  useEffect(() => {
    fetch('/catalog.json')
      .then(res => res.json())
      .then(data => setCatalog(data))

    const saved = localStorage.getItem('audiolibros-progress')
    if (saved) {
      setProgress(JSON.parse(saved))
    }
  }, [])

  if (!catalog) {
    return (
      <main style={styles.container}>
        <h1 style={styles.title}>Audiolibros</h1>
        <p style={styles.loading}>Cargando...</p>
      </main>
    )
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Audiolibros</h1>
      <div style={styles.bookList}>
        {catalog.books.map(book => {
          const bookProgress = progress[book.id]
          return (
            <Link key={book.id} href={`/book/${book.id}`} style={styles.bookCard}>
              <h2 style={styles.bookTitle}>{book.title}</h2>
              <p style={styles.bookMeta}>{book.chapters.length} capítulos</p>
              {bookProgress && (
                <p style={styles.bookProgress}>
                  Capítulo {bookProgress.chapterIndex + 1}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '24px',
    color: '#ffffff',
  },
  loading: {
    color: '#a0a0a0',
  },
  bookList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bookCard: {
    display: 'block',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    transition: 'background-color 0.2s',
  },
  bookTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#ffffff',
  },
  bookMeta: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  bookProgress: {
    fontSize: '13px',
    color: '#3b82f6',
    marginTop: '6px',
  },
}
