import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { WalletConnectGate } from '@/components/WalletConnectGate'
import Home from '@/pages/Home'
import PhoneVerification from '@/pages/PhoneVerification'
import XVerification from '@/pages/XVerification'
import XCallback from '@/pages/XCallback'
import GoogleVerification from '@/pages/GoogleVerification'
import GoogleCallback from '@/pages/GoogleCallback'
import Certificates from '@/pages/Certificates'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
      <WalletConnectGate />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify/phone" element={<PhoneVerification />} />
        <Route path="/verify/x" element={<XVerification />} />
        <Route path="/verify/x/callback" element={<XCallback />} />
        <Route path="/verify/google" element={<GoogleVerification />} />
        <Route path="/verify/google/callback" element={<GoogleCallback />} />
        <Route path="/certificates" element={<Certificates />} />
      </Routes>
    </BrowserRouter>
  )
}
