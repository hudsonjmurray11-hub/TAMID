import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';
import '@fontsource/rubik/latin-900.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/hebrew-900.css';
import '@fontsource/overpass/latin-400.css';
import '@fontsource/overpass/latin-600.css';
import '@fontsource/overpass/latin-700.css';
import '@fontsource/overpass/latin-800.css';
import '@fontsource/shrikhand/latin-400.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Demo, Home, Host, Join, NotFound, Play } from './screens/routes';
import './styles.css';
import './screens.css';

const routes: Record<string, () => React.JSX.Element | null> = {
  '/': Home,
  '/host': Host,
  '/join': Join,
  '/play': Play,
  '/demo': Demo,
};

const path = location.pathname.replace(/\/+$/, '') || '/';
const Page = routes[path] ?? NotFound;
const titles: Record<string, string> = {
  '/host': 'Host · Next Stop: Tel Aviv',
  '/join': 'Join · Next Stop: Tel Aviv',
  '/play': 'Solo · Next Stop: Tel Aviv',
  '/demo': 'Demo · Next Stop: Tel Aviv',
};
document.title = titles[path] ?? 'Next Stop: Tel Aviv';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);

// Offline cache for presentation fallback (needs https or localhost).
if ('serviceWorker' in navigator && import.meta.env.PROD && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      (window as unknown as { __swFailed?: boolean }).__swFailed = true;
    });
  });
}
