import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

// Block text selection globally
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
});

// Block context menu globally
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
