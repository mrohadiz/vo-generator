import '@fontsource-variable/inter';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fieldnote-ui/theme/styles.css';
import '@fieldnote-ui/ui/styles.css';
import '@fieldnote-ui/layouts/styles.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FieldNoteProvider } from '@fieldnote-ui/theme';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Elemen #root tidak ditemukan');

createRoot(container).render(
  <StrictMode>
    <FieldNoteProvider defaultPreference="light">
      <App />
    </FieldNoteProvider>
  </StrictMode>,
);
