'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

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
  pdfFileId?: string
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

const SPEEDS = [0.5, 0.75, 1, 1.5, 2]

type ViewMode = 'audio' | 'pdf'

export default function BookPage() {
  const params = useParams()
  const bookId = params.bookId as string
  
  const [book, setBook] = useState<Book | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('audio')
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressSaveRef = useRef<NodeJS.Timeout>()

  const saveProgress = useCallback(() => {
    if (!book || !audioRef.current) return
    
    const progress: Progress = {
      bookId: book.id,
      chapterIndex,
      currentTime: audioRef.current.currentTime,
      playbackRate,
    }
    
    const allProgress = JSON.parse(localStorage.getItem('audiolibros-progress') || '{}')
    allProgress[book.id] = progress
    localStorage.setItem('audiolibros-progress', JSON.stringify(allProgress))
  }, [book, chapterIndex, playbackRate])

  useEffect(() => {
    fetch('/catalog.json')
      .then(res => res.json())
      .then((data: Catalog) => {
        const foundBook = data.books.find(b => b.id === bookId)
        if (foundBook) {
          setBook(foundBook)
          
          const saved = localStorage.getItem('audiolibros-progress')
          if (saved) {
            const allProgress = JSON.parse(saved)
            const bookProgress = allProgress[foundBook.id] as Progress | undefined
            if (bookProgress) {
              setChapterIndex(bookProgress.chapterIndex)
              setCurrentTime(bookProgress.currentTime)
              setPlaybackRate(bookProgress.playbackRate)
            }
          }
        }
        setIsLoading(false)
      })
  }, [bookId])

  useEffect(() => {
    if (!book || !audioRef.current) return
    
    const audio = audioRef.current
    audio.playbackRate = playbackRate
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    
    const handleDurationChange = () => {
      setDuration(audio.duration)
    }
    
    const handleEnded = () => {
      if (chapterIndex < book.chapters.length - 1) {
        setChapterIndex(prev => prev + 1)
        setCurrentTime(0)
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
      }
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [book, chapterIndex])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    progressSaveRef.current = setInterval(saveProgress, 5000)
    return () => {
      if (progressSaveRef.current) {
        clearInterval(progressSaveRef.current)
      }
      saveProgress()
    }
  }, [saveProgress])

  useEffect(() => {
    if (!book || !audioRef.current) return
    
    const audio = audioRef.current
    const chapter = book.chapters[chapterIndex]
    
    audio.src = `/api/audio/${chapter.fileId}`
    audio.load()
    
    if (currentTime > 0 && chapterIndex === (JSON.parse(localStorage.getItem('audiolibros-progress') || '{}')[book.id]?.chapterIndex ?? -1)) {
      audio.currentTime = currentTime
    }
    
    if (isPlaying) {
      audio.play().catch(() => {})
    }
  }, [book, chapterIndex])

  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const selectChapter = (index: number) => {
    setChapterIndex(index)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  if (isLoading) {
    return (
      <main style={styles.container}>
        <p style={styles.loading}>Cargando...</p>
      </main>
    )
  }

  if (!book) {
    return (
      <main style={styles.container}>
        <p style={styles.loading}>Libro no encontrado</p>
        <Link href="/" style={styles.backLink}>← Volver</Link>
      </main>
    )
  }

  const currentChapter = book.chapters[chapterIndex]
  const hasPdf = Boolean(book.pdfFileId)

  return (
    <main style={styles.container}>
      <audio ref={audioRef} preload="metadata" />
      
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>← Volver</Link>
        <h1 style={styles.title}>{book.title}</h1>
      </header>

      {hasPdf && (
        <div style={styles.tabContainer}>
          <button
            onClick={() => setViewMode('audio')}
            style={{
              ...styles.tabButton,
              ...(viewMode === 'audio' ? styles.tabButtonActive : {}),
            }}
          >
            Audio
          </button>
          <button
            onClick={() => setViewMode('pdf')}
            style={{
              ...styles.tabButton,
              ...(viewMode === 'pdf' ? styles.tabButtonActive : {}),
            }}
          >
            PDF
          </button>
        </div>
      )}

      {viewMode === 'pdf' && book.pdfFileId ? (
        <div style={styles.pdfContainer}>
          <iframe
            src={`https://drive.google.com/file/d/${book.pdfFileId}/preview`}
            style={styles.pdfViewer}
            allow="autoplay"
            title={`PDF de ${book.title}`}
          />
        </div>
      ) : (
        <>
          <div style={styles.player}>
        <p style={styles.nowPlaying}>
          {currentChapter.title}
        </p>
        
        <div style={styles.timeRow}>
          <span style={styles.time}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={styles.seekBar}
          />
          <span style={styles.time}>{formatTime(duration)}</span>
        </div>

        <div style={styles.controls}>
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            style={styles.speedSelect}
            aria-label="Velocidad de reproducción"
          >
            {SPEEDS.map(speed => (
              <option key={speed} value={speed}>{speed}x</option>
            ))}
          </select>
          <button onClick={togglePlay} style={styles.playBtn}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => chapterIndex < book.chapters.length - 1 && selectChapter(chapterIndex + 1)}
            style={styles.skipBtn}
            disabled={chapterIndex >= book.chapters.length - 1}
          >
            ⏭
          </button>
        </div>
      </div>

      <div style={styles.chapterList}>
        <h2 style={styles.chapterListTitle}>Capítulos</h2>
        {book.chapters.map((chapter, index) => (
          <button
            key={chapter.fileId}
            onClick={() => selectChapter(index)}
            style={{
              ...styles.chapterItem,
              backgroundColor: index === chapterIndex ? '#2a2a2a' : 'transparent',
            }}
          >
            <span style={styles.chapterNumber}>{chapter.number.toString().padStart(2, '0')}</span>
            <span style={styles.chapterTitle}>{chapter.title}</span>
            {index === chapterIndex && (
              <span style={styles.playingIndicator}>{isPlaying ? '▶' : '⏸'}</span>
            )}
          </button>
        ))}
      </div>
        </>
      )}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto',
    paddingBottom: '200px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '4px',
  },
  tabButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#a0a0a0',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  pdfContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  pdfViewer: {
    width: '100%',
    height: 'calc(100vh - 200px)',
    minHeight: '500px',
    border: 'none',
    display: 'block',
  },
  loading: {
    color: '#a0a0a0',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    display: 'inline-block',
    color: '#3b82f6',
    fontSize: '14px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
  },
  player: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  nowPlaying: {
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#ffffff',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  time: {
    fontSize: '12px',
    color: '#a0a0a0',
    minWidth: '40px',
    textAlign: 'center',
  },
  seekBar: {
    flex: 1,
    height: '4px',
    appearance: 'none',
    backgroundColor: '#3a3a3a',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
  },
  speedSelect: {
    width: '64px',
    height: '44px',
    backgroundColor: '#2a2a2a',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0a0a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: '24px',
    paddingLeft: '8px',
  },
  playBtn: {
    width: '64px',
    height: '64px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: '48px',
    height: '36px',
    backgroundColor: '#2a2a2a',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
  },
  chapterList: {
    marginTop: '12px',
  },
  chapterListTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#ffffff',
  },
  chapterItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    marginBottom: '4px',
    cursor: 'pointer',
  },
  chapterNumber: {
    color: '#a0a0a0',
    fontSize: '14px',
    marginRight: '12px',
    fontFamily: 'monospace',
  },
  chapterTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: '15px',
  },
  playingIndicator: {
    color: '#3b82f6',
    fontSize: '12px',
  },
}
