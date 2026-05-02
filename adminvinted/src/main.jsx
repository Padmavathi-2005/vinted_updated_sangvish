import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/Admin.css';
import { LocalizationProvider } from './context/LocalizationContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LocalizationProvider>
            <SettingsProvider>
                <App />
            </SettingsProvider>
        </LocalizationProvider>
    </React.StrictMode>
);
