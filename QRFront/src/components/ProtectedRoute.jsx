// src/components/ProtectedRoute.jsx
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';

function GlobalReset() {
    return (
        <style>{`
      *,*::before,*::after { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body { margin: 0; }
    `}</style>
    );
}

export default function ProtectedRoute() {
    const location = useLocation();
    const { token, booting } = useSelector((s) => s.user || {})

    // ✅ 로컬스토리지 토큰도 인정 (로그인 직후 렌더 타이밍 이슈 방지)
    const lsToken = localStorage.getItem('access_token');
    //console.log("isToken", lsToken)
    const authed = token || lsToken;  // 🔥 토큰만 있으면 통과 (myRole 요구 X)

    // 1) 인증이면 무조건 통과 (booting 무시)
    if (authed) return <Outlet />;

    // 2) 인증 전 + 세션 확인 중이면 스피너
    if (booting) {
        return (
            <div>
                <GlobalReset />
                <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
                    <Spin />
                    <div style={{ marginTop: 8, color: '#666' }}>세션 확인 중...</div>
                </div>
            </div>
        );
    }

    // 3) 그 외엔 로그인으로 (원래 가려던 곳을 carry)
    return <Navigate to="/login" state={{ from: location }} replace />;
}
