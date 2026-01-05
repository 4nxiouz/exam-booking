import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* เอา BrowserRouter ออกจากตรงนี้ เพราะเราไปใส่ใน App.tsx แล้ว */}
    <App />
  </StrictMode>
);
