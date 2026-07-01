type TeseLogoProps = {
  size?: number
  className?: string
}

export function TeseLogo ({ size = 48, className = '' }: TeseLogoProps) {
  const height = Math.round(size * (760 / 660))

  return (
    <img
      src="/logo.svg"
      alt="Tese"
      width={size}
      height={height}
      className={className}
      draggable={false}
    />
  )
}
