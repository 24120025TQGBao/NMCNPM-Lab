import { useLocation } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../auth/useAuth'
import { vi } from '../../i18n/vi'

// Trang giữ chỗ của bảng tin (FE04/FE07 sẽ làm). Nút "Đăng bài" nằm ở đây theo thiết kế.
export default function CommunityPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const action = isAuthenticated ? (
    <Button to="/posts/new">
      <PenSquare aria-hidden="true" size={18} strokeWidth={1.5} />
      {vi.community.newPost}
    </Button>
  ) : (
    <Button to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`} variant="secondary">
      {vi.community.loginToPost}
    </Button>
  )
  return (
    <>
      <PageHeader title={vi.community.title} subtitle={vi.community.subtitle} />
      <div className="mb-6">{action}</div>
      <EmptyState title={vi.construction.title}>{vi.community.soon}</EmptyState>
    </>
  )
}
