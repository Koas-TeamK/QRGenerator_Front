// components/QRSearchModal.jsx
import React, { useEffect, useMemo } from "react";
import {
    Modal, Form, DatePicker, Row, Col,
    Button, Space, Table, Tag, Typography, Tooltip, message as antdMessage
} from "antd";
import { CalendarOutlined, SearchOutlined, ReloadOutlined, LinkOutlined, CopyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { qrSearchRequest, qrSearchReset, selectQrSearch } from "@/features/qr/qrSlice";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// base64 본문만 저장된 경우 dataURL로 재조립
const toImageSrc = (val) => (val ? (val.startsWith("http") ? val : `data:image/png;base64,${val}`) : "");

export default function QRSearchModal({ open, onClose }) {
    const dispatch = useDispatch();
    const { items, loading, error, page, pageSize, total, filters } = useSelector(selectQrSearch);
    const [form] = Form.useForm();

    // 열릴 때 이전 날짜 필터 복원
    useEffect(() => {
        if (!open) return;
        const f = { ...filters };
        if (f.dateFrom || f.dateTo) {
            f.dateRange = [
                f.dateFrom ? dayjs(f.dateFrom) : null,
                f.dateTo ? dayjs(f.dateTo) : null,
            ];
        }
        form.setFieldsValue(f);
    }, [open, filters, form]);

    // 날짜만으로 검색
    const onSearch = (pageOverride = 1, pageSizeOverride = pageSize) => {
        form.validateFields().then((vals) => {
            const f = {};
            const dr = vals.dateRange;
            if (Array.isArray(dr) && (dr[0] || dr[1])) {
                if (dr[0]) f.dateFrom = dr[0].format("YYYY-MM-DD");
                if (dr[1]) f.dateTo = dr[1].format("YYYY-MM-DD");
            }
            dispatch(qrSearchRequest({ page: pageOverride, pageSize: pageSizeOverride, filters: f }));
        });
    };

    const onReset = () => {
        form.resetFields();
        dispatch(qrSearchReset());
    };

    const quickDate = (type) => {
        const today = dayjs();
        if (type === "today") form.setFieldsValue({ dateRange: [today, today] });
        if (type === "7d") form.setFieldsValue({ dateRange: [today.subtract(6, "day"), today] });
        if (type === "30d") form.setFieldsValue({ dateRange: [today.subtract(29, "day"), today] });
    };

    const copy = async (text) => {
        try { await navigator.clipboard.writeText(text); antdMessage.success("복사됨"); }
        catch { window.prompt("Copy this:", text); }
    };

    const columns = useMemo(() => [
        {
            title: "QR",
            dataIndex: "imageUrl",
            key: "imageUrl",
            width: 84,
            render: (val, record) =>
                val ? (
                    <img
                        alt={record.serial}
                        src={toImageSrc(val)}
                        width={52}
                        height={52}
                        style={{ objectFit: "contain", borderRadius: 8, border: "1px solid #eee" }}
                    />
                ) : <Tag>no image</Tag>,
        },
        {
            title: "Serial",
            dataIndex: "serial",
            key: "serial",
            width: 120,
            render: (v) => <Text code>{v}</Text>,
        },
        {
            title: "Item", dataIndex: "itemName", key: "itemName", width: 160, ellipsis: true,
            render: (v) => v || <Text type="secondary">-</Text>
        },
        {
            title: "Message", dataIndex: "message", key: "message", ellipsis: true,
            render: (v) => v || <Text type="secondary">-</Text>
        },
        {
            title: "출고날짜", dataIndex: "createdDate", key: "createdDate", width: 130,
            render: (v) => v || <Text type="secondary">-</Text>
        },
        {
            title: "QR URL",
            dataIndex: "qrUrl",
            key: "qrUrl",
            ellipsis: true,
            render: (url) =>
                url ? (
                    <Space size="small" wrap>
                        <a href={url} target="_blank" rel="noreferrer"><LinkOutlined /> Open</a>
                        <Tooltip title="Copy URL">
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(url)} />
                        </Tooltip>
                        <Text type="secondary" ellipsis style={{ maxWidth: 260 }}>{url}</Text>
                    </Space>
                ) : <Tag>none</Tag>,
        },
    ], []);

    const pagination = {
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: (p, ps) => onSearch(p, ps),
    };

    return (
        <Modal
            title={
                <Space>
                    <SearchOutlined />
                    <span>QR 검색 (날짜만)</span>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                        {total ? `총 ${total.toLocaleString()}건` : null}
                    </Text>
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={960}
            destroyOnClose
            footer={null}
        >
            <Form form={form} layout="vertical" onFinish={() => onSearch(1, pageSize)}>
                <Row gutter={12} align="bottom">
                    <Col xs={24} md={16}>
                        <Form.Item
                            label={<Space size={4}><CalendarOutlined /> 출고날짜 범위</Space>}
                            name="dateRange"
                            tooltip="하나만 선택하면 해당 일자만 검색"
                        >
                            <RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" allowEmpty={[true, true]} />
                        </Form.Item>
                        <Space size="small" wrap>
                            <Button size="small" onClick={() => quickDate("today")}>오늘</Button>
                            <Button size="small" onClick={() => quickDate("7d")}>최근 7일</Button>
                            <Button size="small" onClick={() => quickDate("30d")}>최근 30일</Button>
                        </Space>
                    </Col>
                    <Col xs={24} md={8} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={onReset}>초기화</Button>
                            <Button type="primary" htmlType="submit" loading={loading}>검색</Button>
                        </Space>
                    </Col>
                </Row>
            </Form>

            <Table
                style={{ marginTop: 12 }}
                rowKey="key"
                size="middle"
                columns={columns}
                dataSource={items}
                loading={loading}
                pagination={pagination}
            />

            {error && <div style={{ color: '#d4380d', marginTop: 8 }}>오류: {String(error)}</div>}
        </Modal>
    );
}
