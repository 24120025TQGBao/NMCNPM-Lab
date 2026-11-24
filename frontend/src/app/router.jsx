import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import NotFoundPage from './NotFoundPage'
import UnderConstructionPage from './UnderConstructionPage'
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { RequireRole } from '../features/auth/RequireRole'
import CommunityPage from '../features/community/CommunityPage'
import PostDetailPage from '../features/posts/PostDetailPage'
import CreatePostPage from '../features/posts/CreatePostPage'
import DishListPage from '../features/dishes/DishListPage'
import SuggestPage from '../pages/SuggestPage'
import SearchPage from '../pages/SearchPage'
import DishDetailPage from '../pages/DishDetailPage'
import RecipeDetailPage from '../pages/RecipeDetailPage'
import { ROLE_ADMIN } from '../lib/config'
import { vi } from '../i18n/vi'

const f = vi.construction.features
const wip = (name) => <UnderConstructionPage feature={name} />

// Route chưa làm hiển thị trang "Đang xây dựng". RequireAuth/RequireRole chỉ chặn ở giao diện; backend kiểm tra quyền thật.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <CommunityPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'posts/:id', element: <PostDetailPage /> },
      { path: 'dishes', element: <DishListPage /> },
      { path: 'goi-y', element: <SuggestPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'dishes/:id', element: <DishDetailPage /> },
      { path: 'recipes/:id', element: <RecipeDetailPage /> },
      { path: 'dishes/:id/recipes', element: wip(f.dishRecipes) },
      { path: 'by-ingredient', element: wip(f.byIngredient) },
      { path: 'restaurants', element: wip(f.restaurants) },
      {
        element: <RequireAuth />,
        children: [
          { path: 'posts/new', element: <CreatePostPage /> },
          { path: 'posts/:id/edit', element: wip(f.editPost) },
          { path: 'me/drafts', element: wip(f.drafts) },
          { path: 'saved', element: wip(f.saved) },
        ],
      },
      {
        element: <RequireRole role={ROLE_ADMIN} />,
        children: [{ path: 'admin/reports', element: wip(f.adminReports) }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
