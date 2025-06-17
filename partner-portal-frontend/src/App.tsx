import { Routes, Route, Navigate } from 'react-router-dom'
import { PartnerOnboarding } from './pages/PartnerOnboarding'
import { AppBuilder } from './pages/AppBuilder'
import { Dashboard } from './pages/Dashboard'
import { Layout } from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<PartnerOnboarding />} />
        <Route path="/builder" element={<AppBuilder />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </Layout>
  )
}

export default App 