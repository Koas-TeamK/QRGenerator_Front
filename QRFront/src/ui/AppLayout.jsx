// AppLayout.jsx
import { Layout, Menu, Input } from "antd";
import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CalendarOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import QRSearchModal from "@/components/QRSearchModal";          // 날짜 검색 모달(로컬 state로 여닫음)
import QRSerialSearchModal from "@/components/QRSerialSearchModal"; // 시리얼 검색 모달(디스패치로 여닫음)
import { qrSerialOpen, qrSerialRequest } from "@/features/qr/qrSlice";

const { Search } = Input;

// 전역 최소 리셋(스크롤 유발 여백 제거)
function GlobalReset() {
    return (
        <style>{`
      *,*::before,*::after { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body { margin: 0; }
    `}</style>
    );
}

// 유틸: 4자리 제로패딩 & 검색어 파싱(12 | 1-20 | 0001~0120)
const pad4 = (n) => String(n).padStart(4, "0");
const parseSerial = (value) => {
    const s = String(value || "").trim();
    if (!s) return null;
    const r = s.match(/^(\d{1,4})\s*[-~]\s*(\d{1,4})$/); // 범위
    if (r) {
        const a = pad4(r[1]); const b = pad4(r[2]);
        return a < b ? { serialFrom: a, serialTo: b } : { serialFrom: b, serialTo: a };
    }
    const one = s.match(/^\d{1,4}$/); // 단건
    if (one) { const v = pad4(one[0]); return { serialFrom: v, serialTo: v }; }
    return null;
};

export default function AppLayout() {
    const { token } = useSelector((s) => s.user || {});
    const location = useLocation();
    const dispatch = useDispatch();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 날짜 검색 모달은 로컬 state로 유지
    const [openSearchModal, setOpenSearchModal] = useState(false);

    // antd Menu items API (children deprecate 경고 제거)
    const menuItems = useMemo(() => ([
        { key: "/make", label: <Link to="/make">QR 생성하기</Link> },
        { key: "/list", label: <Link to="/list">QR 리스트</Link> },
    ]), []);

    const onSearch = (value) => {
        const f = parseSerial(value);
        if (!f) {
            return;
        }
        dispatch(qrSerialOpen());
        dispatch(qrSerialRequest({ page: 1, pageSize: 10, filters: f }));
    };

    return (
        <div>
            <GlobalReset />
            <Layout style={{ minHeight: "100dvh" }}>
                <Layout.Header style={{ display: "flex", alignItems: "center", backgroundColor: "white" }}>
                    <Link to="/">
                        <img
                            src="/img/logo.svg"
                            alt="Koas"
                            style={{ width: "100px", cursor: "pointer", display: "block" }}
                        />
                    </Link>

                    <Menu
                        theme="light"
                        mode="horizontal"
                        items={menuItems}
                        style={{ flex: 1, borderBottom: "none", marginLeft: "1%" }}
                    />

                    <Search
                        placeholder="시리얼 검색: 4자리수 입력"
                        onSearch={onSearch}
                        enterButton
                        style={{ width: "30%" }}
                    />

                    <CalendarOutlined
                        style={{ fontSize: 25, marginLeft: "1%", color: "#0c5a68ff", cursor: "pointer" }}
                        onClick={() => setOpenSearchModal(true)}
                    />

                    {/* 날짜 검색 모달: 로컬 state 제어 */}
                    <QRSearchModal open={openSearchModal} onClose={() => setOpenSearchModal(false)} />
                    {/* 시리얼 검색 모달: 디스패치 제어 → 항상 한 번만 마운트 */}
                    <QRSerialSearchModal />
                </Layout.Header>

                <Layout.Content style={{ padding: 16 }}>
                    <Outlet />
                </Layout.Content>
            </Layout>
        </div>
    );
}
