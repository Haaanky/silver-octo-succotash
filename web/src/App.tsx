import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import StockList from './pages/StockList'
import Scan from './pages/Scan'
import Products from './pages/Products'
import History from './pages/History'
import Export from './pages/Export'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<StockList />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/products" element={<Products />} />
            <Route path="/history" element={<History />} />
            <Route path="/export" element={<Export />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
