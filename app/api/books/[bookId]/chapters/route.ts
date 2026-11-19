import { NextRequest, NextResponse } from 'next/server'
import catalogData from '@/public/catalog.json'

interface Chapter {
  number: number
  title: string
  fileId: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
}

interface DriveListResponse {
  files?: DriveFile[]
  nextPageToken?: string
}

export const revalidate = 600

function parseChapterNumber(filename: string): number | null {
  const match = filename.match(/^(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

function formatChapterTitle(chapterNumber: number, maxChapters: number): string {
  const padLength = maxChapters >= 100 ? 3 : 2
  return `Capítulo ${chapterNumber.toString().padStart(padLength, '0')}`
}

function isAudioFile(file: DriveFile): boolean {
  if (file.mimeType?.startsWith('audio/')) {
    return true
  }
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.wma']
  const lowerName = file.name.toLowerCase()
  return audioExtensions.some(ext => lowerName.endsWith(ext))
}

async function fetchDriveFiles(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType),nextPageToken',
      pageSize: '1000',
      key: apiKey,
    })
    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { next: { revalidate: 600 } }
    )

    if (!response.ok) {
      throw new Error(`Drive API error: ${response.status}`)
    }

    const data: DriveListResponse = await response.json()
    if (data.files) {
      allFiles.push(...data.files)
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return allFiles
}

function driveFilesToChapters(files: DriveFile[], pdfFileId?: string): Chapter[] {
  const audioFiles = files.filter(f => {
    if (pdfFileId && f.id === pdfFileId) return false
    return isAudioFile(f)
  })

  const chaptersMap = new Map<number, { fileId: string; name: string }>()

  for (const file of audioFiles) {
    const num = parseChapterNumber(file.name)
    if (num !== null && !chaptersMap.has(num)) {
      chaptersMap.set(num, { fileId: file.id, name: file.name })
    }
  }

  const sortedNumbers = Array.from(chaptersMap.keys()).sort((a, b) => a - b)
  const maxChapter = sortedNumbers.length > 0 ? Math.max(...sortedNumbers) : 0

  return sortedNumbers.map(num => ({
    number: num,
    title: formatChapterTitle(num, maxChapter),
    fileId: chaptersMap.get(num)!.fileId,
  }))
}

function mergeChapters(driveChapters: Chapter[], hardcodedChapters: Chapter[]): Chapter[] {
  const merged = new Map<number, Chapter>()

  for (const ch of hardcodedChapters) {
    merged.set(ch.number, ch)
  }

  for (const ch of driveChapters) {
    merged.set(ch.number, ch)
  }

  const sortedNumbers = Array.from(merged.keys()).sort((a, b) => a - b)
  const maxChapter = sortedNumbers.length > 0 ? Math.max(...sortedNumbers) : 0

  return sortedNumbers.map(num => {
    const ch = merged.get(num)!
    return {
      number: ch.number,
      title: formatChapterTitle(ch.number, maxChapter),
      fileId: ch.fileId,
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params
  const book = catalogData.books.find(b => b.id === bookId)

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  const hardcodedChapters: Chapter[] = book.chapters
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ chapters: hardcodedChapters })
  }

  try {
    const driveFiles = await fetchDriveFiles(book.folderId, apiKey)
    const driveChapters = driveFilesToChapters(driveFiles, book.pdfFileId)

    if (driveChapters.length === 0) {
      return NextResponse.json({ chapters: hardcodedChapters })
    }

    const merged = mergeChapters(driveChapters, hardcodedChapters)
    return NextResponse.json({ chapters: merged })
  } catch {
    return NextResponse.json({ chapters: hardcodedChapters })
  }
}
