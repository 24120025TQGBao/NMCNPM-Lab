export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-[40px] leading-[44px] font-semibold md:text-[64px] md:leading-[68px]">{title}</h1>
      <div aria-hidden="true" className="mt-3 h-[5px] w-16 bg-lemon-gold" />
      {subtitle && <p className="mt-4 text-ink-muted">{subtitle}</p>}
    </div>
  )
}
