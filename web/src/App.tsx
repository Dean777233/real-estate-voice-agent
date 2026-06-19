import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CallScreen } from './components/CallScreen'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { CallProvider } from './context/CallContext'
import { AuthPage } from './pages/AuthPage'
import { CriteriaPage } from './pages/CriteriaPage'
import { ListingsPage } from './pages/ListingsPage'
import { WatchlistPage } from './pages/WatchlistPage'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <BrowserRouter>
          <CallScreen />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/listings" replace />} />
              <Route path="listings" element={<ListingsPage />} />
              <Route path="criteria" element={<CriteriaPage />} />
              <Route path="watchlist" element={<WatchlistPage />} />
              <Route path="login" element={<AuthPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CallProvider>
    </AuthProvider>
  )
}
