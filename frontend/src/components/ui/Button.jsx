import { Link } from 'react-router-dom'

const base =
  'inline-flex items-center justify-center gap-2 rounded-control px-5 min-h-11 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 no-underline'
const variants = {
  primary: 'bg-jungle-green text-white hover:bg-[#033d0b]',
  accent: 'bg-lemon-gold text-ink hover:bg-[#cfab1d]',
  secondary: 'bg-white text-ink border border-border hover:bg-surface',
}

export function Button({ variant = 'primary', to, className = '', ...props }) {
  const classes = `${base} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={classes} {...props} />
  return <button type="button" className={classes} {...props} />
}
