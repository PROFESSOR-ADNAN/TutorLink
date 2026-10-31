import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './assets/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            padding: '14px 18px',
            borderRadius: '12px',
            boxShadow: '0 12px 32px -4px rgb(0 0 0 / 0.18), 0 4px 12px -2px rgb(0 0 0 / 0.08)',
            maxWidth: '420px',
          },
          success: {
            iconTheme: { primary: '#1B4332', secondary: '#fff' },
            style: { background: '#1B4332', color: '#fff' },
          },
          error: {
            iconTheme: { primary: '#fff', secondary: '#dc2626' },
            style: { background: '#dc2626', color: '#fff' },
          },
        }}
      />
    </BrowserRouter>
  </ThemeProvider>
);
