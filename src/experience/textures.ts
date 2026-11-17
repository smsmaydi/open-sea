import * as THREE from 'three'

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function makeSailTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvasTexture(canvas)

  ctx.fillStyle = '#f4ead7'
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = '#e4d4b6'
  ctx.lineWidth = 22
  ctx.strokeRect(18, 18, 476, 476)
  ctx.fillStyle = '#9d2c2c'
  ctx.fillRect(0, 312, 512, 34)
  ctx.fillStyle = '#e0b15a'
  ctx.fillRect(0, 346, 512, 8)

  ctx.save()
  ctx.translate(256, 188)
  ctx.strokeStyle = '#8d2a2a'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(0, 0, 58, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#e0b15a'
  ctx.beginPath()
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
    const radius = i % 2 === 0 ? 42 : 16
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  return canvasTexture(canvas)
}

export function makeFlagTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvasTexture(canvas)

  ctx.fillStyle = '#8e2424'
  ctx.fillRect(0, 0, 256, 160)
  ctx.fillStyle = '#e0b15a'
  ctx.save()
  ctx.translate(86, 80)
  ctx.beginPath()
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
    const radius = i % 2 === 0 ? 36 : 14
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  return canvasTexture(canvas)
}

export function makeSignTexture(title: string, accent: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvasTexture(canvas)

  ctx.fillStyle = '#f3e3c6'
  ctx.fillRect(0, 0, 640, 320)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 640, 20)
  ctx.strokeStyle = '#6a4124'
  ctx.lineWidth = 16
  ctx.strokeRect(12, 12, 616, 296)
  ctx.fillStyle = '#3b2616'
  const size = title.length > 11 ? 62 : 76
  ctx.font = `700 ${size}px "Palatino Linotype", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 320, 172)

  return canvasTexture(canvas)
}

export function makeCompassTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvasTexture(canvas)

  ctx.fillStyle = '#1d4d63'
  ctx.fillRect(0, 0, 512, 512)
  const gradient = ctx.createRadialGradient(256, 240, 40, 256, 256, 240)
  gradient.addColorStop(0, '#f0d7a4')
  gradient.addColorStop(1, '#1a6c86')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(256, 256, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e0b15a'
  ctx.lineWidth = 10
  ctx.stroke()
  ctx.fillStyle = '#8e2424'
  ctx.beginPath()
  ctx.moveTo(256, 110)
  ctx.lineTo(286, 256)
  ctx.lineTo(256, 230)
  ctx.lineTo(226, 256)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f4ead7'
  ctx.beginPath()
  ctx.moveTo(256, 400)
  ctx.lineTo(286, 256)
  ctx.lineTo(256, 282)
  ctx.lineTo(226, 256)
  ctx.closePath()
  ctx.fill()

  return canvasTexture(canvas)
}
