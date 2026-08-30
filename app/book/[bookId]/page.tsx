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

const SPEEDS = [0.5, 1, 1.5, 2]

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

  const cycleSpeed = () => {
    const currentIndex = SPEEDS.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % SPEEDS.length
    setPlaybackRate(SPEEDS[nextIndex])
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

  return (
    <main style={styles.container}>
      <audio ref={audioRef} preload="metadata" />
      
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>← Volver</Link>
        <h1 style={styles.title}>{book.title}</h1>
      </header>

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
          <button onClick={cycleSpeed} style={styles.speedBtn}>
            {playbackRate}x
          </button>
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
  speedBtn: {
    width: '48px',
    height: '36px',
    backgroundColor: '#2a2a2a',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
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
