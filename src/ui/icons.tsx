// A small inline SVG icon set — stroke-based, 24×24. No icon-font dependency.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 22, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const DumbbellIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11" />
    <path d="M2.5 9.5l-1 1a1.5 1.5 0 0 0 0 2l9 9a1.5 1.5 0 0 0 2 0l1-1" transform="rotate(180 7.5 14.5)" />
    <path d="M3.5 8.5l3 3" />
    <path d="M20.5 15.5l-3-3" />
    <path d="M2 14l2 2" />
    <path d="M22 10l-2-2" />
  </Svg>
)

// A cleaner dumbbell that reads well at small sizes.
export const Dumbbell = (p: P) => (
  <Svg {...p}>
    <rect x="1.5" y="8.5" width="3.5" height="7" rx="1" />
    <rect x="19" y="8.5" width="3.5" height="7" rx="1" />
    <rect x="5" y="9.75" width="2.5" height="4.5" rx="0.8" />
    <rect x="16.5" y="9.75" width="2.5" height="4.5" rx="0.8" />
    <path d="M7.5 12h9" />
  </Svg>
)

export const Home = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </Svg>
)

export const Chart = (p: P) => (
  <Svg {...p}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M7 16l3.5-4 3 2.5L20 7" />
  </Svg>
)

export const History = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M5.5 3v3.5H9" />
    <path d="M12 8v4.2l3 1.8" />
  </Svg>
)

export const Gear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
  </Svg>
)

export const Plus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Minus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="M4 12.5l5 5 11-11" />
  </Svg>
)

export const Timer = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6" />
  </Svg>
)

export const Flame = (p: P) => (
  <Svg {...p}>
    <path d="M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1.5-4 .2 2-1.5 2.5-1.5 1 0-2-2-3-3-4z" />
    <path d="M8.5 12.5A4 4 0 0 0 12 21a4 4 0 0 0 3.5-8.5" opacity="0.5" />
  </Svg>
)

export const ChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const ChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const X = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const ArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
)

export const Trophy = (p: P) => (
  <Svg {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" />
    <path d="M12 13v3M9 20h6M10 20v-1.5a2 2 0 0 1 4 0V20" />
  </Svg>
)

export const Info = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
)

export const Alert = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l9.5 16.5a1 1 0 0 1-.9 1.5H3.4a1 1 0 0 1-.9-1.5z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
)

export const Download = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
)

export const Upload = (p: P) => (
  <Svg {...p}>
    <path d="M12 17V5M7 9l5-5 5 5" />
    <path d="M4 20h16" />
  </Svg>
)

export const Trash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Svg>
)

export const Pencil = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M14 6l3 3" />
  </Svg>
)

export const Play = (p: P) => (
  <Svg {...p}>
    <path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" stroke="none" />
  </Svg>
)

export const Body = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <path d="M12 8v7M8 11l4-1 4 1M9.5 21l2.5-6 2.5 6" />
  </Svg>
)
