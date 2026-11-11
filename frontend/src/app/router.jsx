import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import NotFoundPage from './NotFoundPage'
import UnderConstructionPage from './UnderConstructionPage'
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'
import CommunityPage from '../features/community/CommunityPage'
import DishListPage from '../features/dishes/DishListPage'
import { vi } from '../i18n/vi'

const f = vi.construction.features
const wip = (name) => <UnderConstructionPage feature={name} />

// Route chưa làm hiển thị trang "Đang xây dựng". Phân quyền (RequireAuth, RequireRole) thêm ở FE02/FE03.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <CommunityPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'posts/new', element: wip(f.newPost) },
      { path: 'posts/:id', element: wip(f.post) },
      { path: 'posts/:id/edit', element: wip(f.editPost) },
      { path: 'me/drafts', element: wip(f.drafts) },
      { path: 'dishes', element: <DishListPage /> },
      { path: 'dishes/:id', element: wip(f.dish) },
      { path: 'dishes/:id/recipes', element: wip(f.dishRecipes) },
      { path: 'recipes/:id', element: wip(f.recipe) },
      { path: 'admin/reports', element: wip(f.adminReports) },
      { path: 'by-ingredient', element: wip(f.byIngredient) },
      { path: 'restaurants', element: wip(f.restaurants) },
      { path: 'saved', element: wip(f.saved) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
