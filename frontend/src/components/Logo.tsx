import logoDark from '../assets/routa-logo.svg'
import logoWhite from '../assets/routa-logo-white.svg'

interface LogoProps {
  variant?: 'dark' | 'white' // "white" = white letters, for the navy header
  className?: string // the size, for example "h-8 w-auto"
}

/** The Routa logo: the word "routa" with the red map pin. */
export default function Logo({ variant = 'dark', className = 'h-8 w-auto' }: LogoProps) {
  return <img src={variant === 'white' ? logoWhite : logoDark} alt="Routa" className={className} />
}