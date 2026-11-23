import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installThirdPartyExtensionErrorGuard} from './utils/extensionErrorGuard';

installThirdPartyExtensionErrorGuard();

createRoot(document.getElementById('root')!).render(<App />);
