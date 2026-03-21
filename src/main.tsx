import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {TikTokAuthProvider} from './context/TikTokAuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TikTokAuthProvider>
      <App />
    </TikTokAuthProvider>
  </StrictMode>,
);
