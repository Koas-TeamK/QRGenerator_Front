// components/QRSerialSearchModal.jsx
import React, { useCallback } from "react";
import {
    Modal, Input, Space, Table, Tag, Typography, Tooltip, Button, message as antdMessage
} from "antd";
import { NumberOutlined, SearchOutlined, LinkOutlined, CopyOutlined, CloseOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
    qrSerialOpen, qrSerialClose, qrSerialRequest,
    selectQrSerial
} from "@/features/qr/qrSlice";

const { Text } = Typography;

const pad4 = (n) => String(n).padStart(4, "0");
const toImageSrc = (val) => (val ? (val.startsWith("http") ? val : `data:image/png;base64,${val}`) : "");

function parseSerialQuery(q) {
    const s = String(q || "").trim();
    if (!s) return null;
    const mRange = s.match(/^(\d{1,4})\s*[-~]\s*(\d{1,4})$/);
    if (mRange) {
        const a = pad4(mRange[1]);
        const b = pad4(mRange[2]);
        const lo = a < b ? a : b;
        const hi = a < b ? b : a;
        return { serialFrom: lo, serialTo: hi };
    }
    const mOne = s.match(/^\d{1,4}$/);
    if (mOne) {
        const v = pad4(mOne[0]);
        return { serialFrom: v, serialTo: v };
    }
    return null;
}

export default function QRSerialSearchModal() {
    const dispatch = useDispatch();
    const { open, items, loading, error, page, pageSize, total, filters } = useSelector(selectQrSerial);

    const copy = async (text) => {
        try { await navigator.clipboard.writeText(text); antdMessage.success("복사됨"); }
        catch { window.prompt("Copy this:", text); }
    };

    const handleSearch = useCallback((value) => {
        const f = parseSerialQuery(value);
        if (!f) {
            antdMessage.warning("형식: 12 (단건) 또는 1-20 (범위)");
            return;
        }
        // 검색만 하면 모달이 열리도록
        dispatch(qrSerialOpen());
        dispatch(qrSerialRequest({ page: 1, pageSize: 10, filters: f }));
    }, [dispatch]);

    const columns = [
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
        { title: "Serial", dataIndex: "serial", key: "serial", width: 120, render: (v) => <Text code>{v}</Text> },
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
    ];

    const pagination = {
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: (p, ps) => dispatch(qrSerialRequest({ page: p, pageSize: ps, filters })),
    };

    return (
        <Modal
            title={
                <Space size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space>
                        <NumberOutlined />
                        <span>Serial 검색</span>
                        <Text type="secondary">{total ? `총 ${total.toLocaleString()}건` : null}</Text>
                    </Space>
                    {/* 모달 헤더에 검색창 */}
                    <Input.Search
                        placeholder="예: 12 또는 1-20"
                        enterButton={<><SearchOutlined /> 검색</>}
                        onSearch={handleSearch}
                        allowClear
                        style={{ minWidth: 280, width: 360 }}
                    />
                </Space>
            }
            open={open}
            onCancel={() => dispatch(qrSerialClose())}
            width={960}
            destroyOnClose
            footer={null}
        >
            <Table
                style={{ marginTop: 8 }}
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
