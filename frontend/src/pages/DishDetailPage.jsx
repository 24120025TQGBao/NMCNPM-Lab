import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function DishDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <h1 className="text-2xl font-bold text-jungle-green mb-4">Chi tiết món ăn #{id}</h1>
      <p className="text-muted mb-8">Tính năng đang được phát triển (FE10).</p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại
      </Button>
    </div>
  )
}
