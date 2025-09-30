// AppLayout.jsx
import { Layout, Menu, Input } from "antd";
import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CalendarOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import QRDateSearchModal from "@/components/QRDateSearchModal";          // 날짜 검색 모달(로컬 state로 여닫음)
import QRSerialSearchModal from "@/components/QRSerialSearchModal"; // 시리얼 검색 모달(디스패치로 여닫음)
import { qrSearchOpen, qrSaveRequest, qrSearchRequest } from "@/features/qr/qrSlice";

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


export default function AppLayout() {
    const { token, myRole } = useSelector((s) => s.user || {});
    const location = useLocation();
    const dispatch = useDispatch();
    //console.log("[AppLayout] myRole : ", myRole)

    // 수정 권한 확인
    const role = typeof myRole === "string" ? myRole : myRole?.role;
    const isAdmin = role === "ADMIN";
    //console.log("[AppLayout] isAdmin -> ", isAdmin)

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const [openSearchModal, setOpenSearchModal] = useState(false);

    const menuItems = useMemo(() => ([
        { key: "/list", label: <Link to="/list">QR 리스트</Link> },
        ...(isAdmin ? [{ key: "/generate", label: <Link to="/generate">QR 생성하기</Link> }] : []),
    ]), [isAdmin]);

    /// 검색
    const onSearch = (value) => {
        if (!value) return; // 형식 아니면 무시(원하면 antd message로 경고 띄우시오)
        console.log("[AppLayout] onSearch, ", value);
        const payload = {
            serial: value
        }
        dispatch(qrSearchOpen({ reset: true }));        // 이전 결과 초기화 후 모달 열기
        dispatch(qrSearchRequest(payload));
        console.log("[AppLayout] onSearch payload ", payload);
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
                    <QRDateSearchModal open={openSearchModal} onClose={() => setOpenSearchModal(false)} />
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
