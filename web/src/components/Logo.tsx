interface LogoProps {
  className?: string
  size?: number
  title?: string
}

export function Logo({ className, size = 40, title = 'DealScout' }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Roof */}
      <path
        d="M8 24 L24 10 L40 24 Z"
        fill="#14b8a6"
        stroke="#0f766e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Chimney accent */}
      <rect x="30" y="14" width="5" height="8" rx="1" fill="#0d9488" />
      {/* House body */}
      <rect
        x="11"
        y="24"
        width="26"
        height="18"
        rx="2"
        fill="#f8fafc"
        stroke="#0d9488"
        strokeWidth="1.5"
      />
      {/* Door */}
      <rect x="20" y="32" width="8" height="10" rx="1.5" fill="#0d9488" />
      <circle cx="26.5" cy="37" r="0.8" fill="#99f6e4" />
      {/* Window */}
      <rect
        x="14"
        y="28"
        width="6"
        height="6"
        rx="1"
        fill="#ccfbf1"
        stroke="#14b8a6"
        strokeWidth="1.2"
      />
      <line x1="17" y1="28" x2="17" y2="34" stroke="#14b8a6" strokeWidth="1" />
      <line x1="14" y1="31" x2="20" y2="31" stroke="#14b8a6" strokeWidth="1" />
      {/* Tag string */}
      <path
        d="M36 18 C36 22 38 24 40 28"
        stroke="#94a3b8"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Sale tag */}
      <g transform="translate(38, 26) rotate(12)">
        <rect x="-7" y="0" width="14" height="16" rx="2" fill="#f97316" stroke="#ea580c" strokeWidth="1.2" />
        <circle cx="0" cy="2.5" r="1.5" fill="#0f172a" />
        <text
          x="0"
          y="12"
          textAnchor="middle"
          fill="#fff"
          fontSize="7"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          $
        </text>
      </g>
    </svg>
  )
}
