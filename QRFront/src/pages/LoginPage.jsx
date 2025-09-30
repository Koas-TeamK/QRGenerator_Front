// src/pages/LoginPage.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Typography, Form, Input, Button, Alert, Card } from "antd";
import { loginRequest } from "@/features/user/userSlice";

const { Title } = Typography;

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

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error, booting, myRole } = useSelector((s) => s.user || {});
  const onFinish = (values) => dispatch(loginRequest(values));

  useEffect(() => {
    if (!booting && !myRole && !token) navigate("/", { replace: true });
  }, [booting, myRole, token, navigate]);

  return (
    <>
      <GlobalReset />

      {/* 화면 전체: 중앙정렬 그리드 */}
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",        // 수직·수평 완전 중앙
          padding: 16,
          background:
            "linear-gradient(135deg,#0b414b 0%,#0b414b 35%,#0e6c7a 100%)",
          overflow: "clip",
        }}
      >
        {/* 가운데 놓일 스택(제목 + 카드 + 카피) */}
        <div style={{ width: "min(100%, 420px)", display: "grid", rowGap: 16 }}>
          <Title
            level={2}
            style={{ margin: 0, textAlign: "center", color: "#e8f3f5", letterSpacing: 0.3 }}
          >
            KOAS
          </Title>

          <Card style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            <Title level={4} style={{ marginTop: 0 }}>
              로그인
            </Title>

            {error && (
              <Alert
                style={{ marginBottom: 16 }}
                type="error"
                showIcon
                message="로그인 실패"
                description={String(error)}
              />
            )}

            <Form
              layout="vertical"
              onFinish={onFinish}
              disabled={loading}
              initialValues={{ remember: true }}
            >
              <Form.Item
                label="아이디"
                name="email"
                rules={[{ required: true, message: "아이디를 입력해주세요." }]}
              >
                <Input placeholder="아이디를 입력해주세요." autoFocus />
              </Form.Item>

              <Form.Item
                label="비밀번호"
                name="password"
                rules={[{ required: true, message: "비밀번호를 입력하시오." }]}
              >
                <Input.Password placeholder="비밀번호를 입력하시오." />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  로그인
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <div
            style={{
              color: "#e8f3f5",
              textAlign: "center",
              opacity: 0.85,
              fontSize: "0.95rem",
              margin: 0,
            }}
          >
            © {new Date().getFullYear()} KOAS
          </div>
        </div>
      </div>
    </>
  );
}
