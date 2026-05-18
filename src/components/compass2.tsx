"use client"

import { useRef, useEffect } from "react"

interface CompassProps {
  heading: number
  size?: number
  darkMode?: boolean
}

export function Compass({ heading, size = 200, darkMode = true }: CompassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Scale factor for all proportional elements
    const s = size / 200

    // Constants
    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.45

    const accent = "#f97316"
    const bezel = darkMode ? "#252526" : "#e8e8e8"
    const bezelStroke = darkMode ? "#3c3c3c" : "#c8c8c8"
    const face = darkMode ? "#1e1e1e" : "#f6f6f6"
    const faceStroke = darkMode ? "#404040" : "#d0d0d0"
    const tick = darkMode ? "rgba(255,255,255,0.88)" : "rgba(20,20,20,0.88)"
    const label = darkMode ? "rgba(255,255,255,0.92)" : "rgba(20,20,20,0.9)"

    // Draw outer bezel
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 5 * s, 0, Math.PI * 2)
    ctx.fillStyle = bezel
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 3 * s, 0, Math.PI * 2)
    ctx.strokeStyle = bezelStroke
    ctx.lineWidth = 2 * s
    ctx.stroke()

    // Draw compass face
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = face
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.strokeStyle = faceStroke
    ctx.lineWidth = 1
    ctx.stroke()

    // Save context for rotation
    ctx.save()

    // Translate to center and rotate (negative because we're rotating the dial, not the indicator)
    ctx.translate(centerX, centerY)
    ctx.rotate((-heading * Math.PI) / 180)

    // Draw cardinal and ordinal directions
    const directions = [
      { label: "N", angle: 0 },
      { label: "NE", angle: 45 },
      { label: "E", angle: 90 },
      { label: "SE", angle: 135 },
      { label: "S", angle: 180 },
      { label: "SW", angle: 225 },
      { label: "W", angle: 270 },
      { label: "NW", angle: 315 },
    ]

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Draw degree markers
    for (let i = 0; i < 360; i += 5) {
      const length = i % 30 === 0 ? 15 * s : i % 10 === 0 ? 10 * s : 5 * s

      ctx.beginPath()
      ctx.moveTo(0, -radius + length)
      ctx.lineTo(0, -radius)
      ctx.strokeStyle = tick
      ctx.lineWidth = i % 30 === 0 ? 2 * s : 1 * s
      ctx.stroke()

      // Draw degree numbers for major divisions
      if (i % 30 === 0) {
        ctx.font = `bold ${Math.round(12 * s)}px system-ui, sans-serif`
        ctx.fillStyle = i === 0 ? accent : label
        ctx.fillText(i.toString(), 0, -radius + 25 * s)
      }

      ctx.rotate((5 * Math.PI) / 180)
    }

    // Draw cardinal and ordinal labels
    ctx.font = `bold ${Math.round(16 * s)}px system-ui, sans-serif`
    directions.forEach((dir) => {
      const angle = (dir.angle * Math.PI) / 180
      const y = -radius + 45 * s

      // Rotate to the direction angle
      ctx.save()
      ctx.rotate(angle)

      // Draw the label
      ctx.fillStyle = dir.label === "N" ? accent : label
      ctx.fillText(dir.label, 0, y)

      ctx.restore()
    })

    // Restore context
    ctx.restore()

    // Draw aircraft/drone silhouette in the center
    const droneSize = 20 * s
    ctx.fillStyle = accent

    // Draw a simple drone shape
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - droneSize / 2)
    ctx.lineTo(centerX + droneSize / 2, centerY)
    ctx.lineTo(centerX, centerY + droneSize / 2)
    ctx.lineTo(centerX - droneSize / 2, centerY)
    ctx.closePath()
    ctx.fill()

    // Draw heading indicator at the top
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius + 2 * s)
    ctx.lineTo(centerX - 10 * s, centerY - radius + 15 * s)
    ctx.lineTo(centerX + 10 * s, centerY - radius + 15 * s)
    ctx.closePath()
    ctx.fillStyle = accent
    ctx.fill()

    // Draw digital heading display
    ctx.font = `bold ${Math.round(14 * s)}px ui-monospace, monospace`
    ctx.fillStyle = label
    ctx.textAlign = "center"
    ctx.fillText(`${heading.toFixed(0)}°`, centerX, centerY + radius - 15 * s)
  }, [heading, size, darkMode])

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%" }}
      />
    </div>
  )
}
