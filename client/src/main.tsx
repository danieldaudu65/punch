import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { apiUrl } from './lib/api';
import { queryClient } from './lib/queryClient';
import { unlockAudio } from './lib/sound';
import './styles/index.css';

// Browsers only allow sound after the user interacts with the page.
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// The free API host sleeps when idle. Pinging it as soon as the page opens
// gives it a head start while the student reads the login screen.
fetch(apiUrl('/health'), { credentials: 'omit' }).catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
