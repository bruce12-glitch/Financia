import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { installThirdPartyExtensionErrorGuard } from './utils/extensionErrorGuard';
import { financiaQueryClient } from './lib/queryClient';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import { FirebaseErrorBoundary } from './components/FirebaseErrorBoundary';

installThirdPartyExtensionErrorGuard();

createRoot(document.getElementById('root')!).render(
  <FirebaseErrorBoundary>
    <QueryClientProvider client={financiaQueryClient}>
      <BrowserRouter>
        <FirebaseAuthProvider>
          <App />
        </FirebaseAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </FirebaseErrorBoundary>
);
