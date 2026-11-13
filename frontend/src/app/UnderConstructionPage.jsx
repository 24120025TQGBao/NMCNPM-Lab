import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { vi } from '../i18n/vi'

export default function UnderConstructionPage({ feature }) {
  return (
    <>
      <PageHeader title={feature} />
      <EmptyState
        title={vi.construction.title}
        action={<Button to="/" variant="secondary">{vi.construction.home}</Button>}
      >
        {vi.construction.feature(feature)}
      </EmptyState>
    </>
  )
}
