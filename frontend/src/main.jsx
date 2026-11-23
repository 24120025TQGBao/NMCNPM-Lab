import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './features/auth/AuthProvider'
import { SuggestSessionProvider } from './features/suggest/SuggestSessionContext'
import { router } from './app/router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SuggestSessionProvider>
        <RouterProvider router={router} />
      </SuggestSessionProvider>
    </AuthProvider>
  </StrictMode>,
)
