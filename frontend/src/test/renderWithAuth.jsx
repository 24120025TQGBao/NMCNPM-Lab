import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthContext } from '../features/auth/AuthContext'

// Dựng router tạm với giá trị AuthContext giả để kiểm thử route guard.
export function renderRoutes(routes, { authValue, initialEntry }) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })
  render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
  return router
}
