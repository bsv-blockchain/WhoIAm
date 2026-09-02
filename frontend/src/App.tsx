import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { WalletConnectGate } from '@/components/WalletConnectGate'
import { useWalletStore } from '@/stores/wallet'
import Home from '@/pages/Home'
import PhoneVerification from '@/pages/PhoneVerification'
import XVerification from '@/pages/XVerification'
import XCallback from '@/pages/XCallback'
import GoogleVerification from '@/pages/GoogleVerification'
import GoogleCallback from '@/pages/GoogleCallback'
import Certificates from '@/pages/Certificates'

export default function App() {
  // Pages reach for the wallet in mount effects — the OAuth callbacks issue a
  // certificate the moment they render. Holding the routes until the gate has
  // settled keeps them from racing a mobile wallet still being resumed and
  // falling back to a local substrate that isn't there.
  const isBootstrapped = useWalletStore((s) => s.isBootstrapped)

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
      <WalletConnectGate />
      {isBootstrapped ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify/phone" element={<PhoneVerification />} />
          <Route path="/verify/x" element={<XVerification />} />
          <Route path="/verify/x/callback" element={<XCallback />} />
          <Route path="/verify/google" element={<GoogleVerification />} />
          <Route path="/verify/google/callback" element={<GoogleCallback />} />
          <Route path="/certificates" element={<Certificates />} />
        </Routes>
      ) : (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          <span className="sr-only">Connecting your wallet…</span>
        </div>
      )}
    </BrowserRouter>
  )
}
