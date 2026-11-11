import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { vi } from '../i18n/vi'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title={vi.notFound.title} />
      <EmptyState action={<Button to="/">{vi.notFound.home}</Button>}>{vi.notFound.body}</EmptyState>
    </>
  )
}
