// Hand-rolled SVG charts — no charting dependency, tiny and crisp on mobile.

export function Sparkline({
  values,
  color = 'var(--accent-ink)',
  height = 40,
}: {
  values: number[]
  color?: string
  height?: number
}) {
  const W = 120
  const H = height
  if (values.length === 0) {
    return <div style={{ height, opacity: 0.4, fontSize: 12 }} className="faint" />
  }
  if (values.length === 1) {
    return (
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <circle cx={W - 4} cy={H / 2} r={3} fill={color} />
      </svg>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 4
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / span) * (H - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${H} ${line} ${W - pad},${H}`
  const id = `sg-${color.replace(/[^a-z]/gi, '')}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </svg>
  )
}

export interface ChartPoint {
  label: string
  y: number
}

export function LineChart({
  points,
  color = 'var(--accent-ink)',
  height = 150,
  formatY = (v: number) => String(Math.round(v)),
}: {
  points: ChartPoint[]
  color?: string
  height?: number
  formatY?: (v: number) => string
}) {
  const W = 320
  const H = height
  const padL = 34
  const padR = 10
  const padT = 12
  const padB = 22

  if (points.length === 0) {
    return <div className="center-empty small">No data yet.</div>
  }

  const ys = points.map((p) => p.y)
  let min = Math.min(...ys)
  let max = Math.max(...ys)
  if (min === max) {
    min = min - 1
    max = max + 1
  }
  const span = max - min
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const xAt = (i: number) =>
    padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const yAt = (v: number) => padT + (1 - (v - min) / span) * plotH

  const linePts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`)
  const line = linePts.join(' ')
  const area = `${xAt(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${line} ${xAt(
    points.length - 1,
  ).toFixed(1)},${(padT + plotH).toFixed(1)}`

  const gridYs = [max, (max + min) / 2, min]
  const id = `lg-${color.replace(/[^a-z]/gi, '')}`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridYs.map((gy, i) => (
        <g key={i}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yAt(gy)}
            y2={yAt(gy)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text x={4} y={yAt(gy) + 3.5} fontSize={9.5} fill="var(--faint)">
            {formatY(gy)}
          </text>
        </g>
      ))}

      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r={2.4} fill={color} />
      ))}

      <text x={padL} y={H - 6} fontSize={9.5} fill="var(--faint)">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={W - padR} y={H - 6} fontSize={9.5} fill="var(--faint)" textAnchor="end">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  )
}
