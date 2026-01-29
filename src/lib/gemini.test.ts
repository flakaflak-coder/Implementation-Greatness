import { describe, it, expect } from 'vitest'
import { getMimeType } from './gemini'

describe('getMimeType', () => {
  it('returns correct MIME type for audio files', () => {
    expect(getMimeType('recording.mp3')).toBe('audio/mpeg')
    expect(getMimeType('audio.wav')).toBe('audio/wav')
    expect(getMimeType('audio.m4a')).toBe('audio/mp4')
    expect(getMimeType('audio.webm')).toBe('audio/webm')
    expect(getMimeType('audio.ogg')).toBe('audio/ogg')
  })

  it('returns correct MIME type for video files', () => {
    expect(getMimeType('video.mp4')).toBe('video/mp4')
  })

  it('returns correct MIME type for document files', () => {
    expect(getMimeType('document.pdf')).toBe('application/pdf')
    expect(getMimeType('document.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(getMimeType('presentation.pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
  })

  it('handles uppercase extensions', () => {
    expect(getMimeType('RECORDING.MP3')).toBe('audio/mpeg')
    expect(getMimeType('Document.PDF')).toBe('application/pdf')
  })

  it('returns octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream')
    expect(getMimeType('file.unknown')).toBe('application/octet-stream')
    expect(getMimeType('noextension')).toBe('application/octet-stream')
  })

  it('handles files with multiple dots', () => {
    expect(getMimeType('my.recording.2024.mp3')).toBe('audio/mpeg')
    expect(getMimeType('file.name.pdf')).toBe('application/pdf')
  })
})
