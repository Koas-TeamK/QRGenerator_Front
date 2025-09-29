import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { store } from './store';

import AppLayout from '@/ui/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

import LoginPage from '@/pages/LoginPage';
import MainPage from '@/pages/MainPage';
import QRGeneratorPage from './pages/QRGeneratorPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={koKR} theme={{ token: { colorPrimary: '#0c5a68ff' } }}>
        <BrowserRouter>
          <Routes>
            {/* 루트는 로그인으로 보냄 */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 로그인(비보호) */}
            <Route path="/login" element={<LoginPage />} />

            {/* 보호 구역 */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* 보호 구역 내부는 상대경로로 */}
                <Route path="/main" element={<MainPage />} />
                <Route path="/make" element={<QRGeneratorPage />} />
                <Route path="/list" element={<MainPage />} />
              </Route>
            </Route>

            {/* 나머지는 전부 로그인으로 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
