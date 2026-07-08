import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './assets/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { fontFamily: '"DM Sans", sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: '#1B4332', secondary: '#fff' } },
      }}
    />
  </BrowserRouter>
);
