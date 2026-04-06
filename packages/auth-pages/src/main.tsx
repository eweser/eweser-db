import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { routerBase } from './lib/config';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter {...(routerBase === '/' ? {} : { basename: routerBase })}>
    <App />
  </BrowserRouter>
);
