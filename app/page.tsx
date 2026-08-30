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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredBooks = catalog.books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Audiolibros</h1>
        <button
          onClick={() => {
            setSearchOpen(!searchOpen)
            if (searchOpen) setSearchQuery('')
          }}
          style={styles.searchBtn}
          aria-label="Buscar libros"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>
      {searchOpen && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          style={styles.searchInput}
          autoFocus
          aria-label="Buscar libros por nombre"
        />
      )}
      <div style={styles.bookList}>
        {filteredBooks.map(book => {
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  searchBtn: {
    width: '44px',
    height: '44px',
    backgroundColor: '#1a1a1a',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    marginBottom: '16px',
    outline: 'none',
    boxSizing: 'border-box',
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
