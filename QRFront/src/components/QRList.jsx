// src/components/QRList.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Table, Image, Space, Button, Tooltip, Tag, Typography, Alert,
    Form, Input, DatePicker, Popconfirm, message as antdMessage
} from "antd";
import {
    DownloadOutlined, EditOutlined, CheckOutlined, CloseOutlined, CopyOutlined, LinkOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

import { selectQrList, qrListRequest, qrUpdateRequest, qrUpdateSuccess, } from "@/features/qr/qrSlice";

const { Text } = Typography;

const EditableCell = ({ editing, dataIndex, title, inputType, record, children, ...rest }) => {
    let inputNode = null;
    if (dataIndex === "message") inputNode = <Input placeholder="메시지" maxLength={200} />;
    else if (dataIndex === "createdDate") inputNode = <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />;
    else inputNode = <Input />;

    return (
        <td {...rest}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={dataIndex === "createdDate" ? [{ required: true, message: "출고날짜를 선택하세요" }] : undefined}
                >
                    {inputNode}
                </Form.Item>
            ) : children}
        </td>
    );
};

export default function QRList() {
    const dispatch = useDispatch();

    // page는 0-based로 관리
    const { items = [], loading, error, page, total } = useSelector(selectQrList);

    // 🔸 스토어 내용을 표시용 로컬 버퍼로 복제
    const [rows, setRows] = useState([]);
    useEffect(() => { setRows(items); }, [items]);

    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState("");
    const isEditing = (record) => record.key === editingKey;

    // 첫 로드: page=0
    useEffect(() => {
        dispatch(qrListRequest({ page: 0, append: false }));
    }, [dispatch]);

    const loadPrev = useCallback(() => {
        if (loading) return;
        const prev = Math.max(0, (page ?? 0) - 1);
        if (prev === (page ?? 0)) return;
        dispatch(qrListRequest({ page: prev, append: false }));
    }, [dispatch, loading, page]);

    const loadNext = useCallback(() => {
        if (loading) return;
        const next = (page ?? 0) + 1;
        dispatch(qrListRequest({ page: next, append: false }));
    }, [dispatch, loading, page]);

    const loadMoreAppend = useCallback(() => {
        if (loading) return;
        const next = (page ?? 0) + 1;
        dispatch(qrListRequest({ page: next, append: true }));
    }, [dispatch, loading, page]);

    const hasMore = typeof total === "number" ? items.length < total : true;

    const onCopy = async (text) => {
        try { await navigator.clipboard.writeText(text); antdMessage.success("복사 완료"); }
        catch { window.prompt("Copy this:", text); }
    };

    const downloadImage = async (record) => {
        const { imageUrl, serial } = record;
        if (!imageUrl) { antdMessage.warning("이미지가 없습니다."); return; }
        const filename = `qr_${serial || "image"}.png`;
        try {
            if (imageUrl.startsWith("data:image")) {
                const a = document.createElement("a");
                a.href = imageUrl; a.download = filename; a.click();
            } else {
                const res = await fetch(imageUrl, { mode: "cors" });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            window.open(imageUrl, "_blank", "noopener,noreferrer");
        }
    };

    const edit = (record) => {
        form.setFieldsValue({
            message: record.message,
            createdDate: record.createdDate ? dayjs(record.createdDate) : null,
        });
        setEditingKey(record.key);
    };
    const cancel = () => setEditingKey("");

    const save = async (key) => {
        try {
            const row = await form.validateFields();
            const createdDateStr = row.createdDate ? row.createdDate.format("YYYY-MM-DD") : "";
            const original = items.find((d) => d.key === key);
            if (!original) return;

            const dto = {
                imageUrl: original.imageUrl,
                qrUrl: original.qrUrl,
                serial: original.serial,
                message: row.message ?? "",
                createdDate: createdDateStr,
                itemName: original.itemName,
                key: original.key,
            };
            // 1. 로컬 반영
            setRows(prev =>
                prev.map(r =>
                    (r.key === original.key || r.serial === original.serial) ? { ...r, ...dto } : r
                )
            );
            setEditingKey("");

            //2. 스토어 낙관적 패치
            dispatch(qrUpdateSuccess(dto));

            //3. 서버 동기화
            dispatch(qrUpdateRequest(dto));
        } catch { }
    };

    const columns = [
        {
            title: "QR",
            dataIndex: "imageUrl",
            key: "imageUrl",
            width: 90,
            render: (src, record) =>
                src ? (
                    <Image
                        src={src}
                        alt={record.serial}
                        width={56}
                        height={56}
                        style={{ objectFit: "contain", borderRadius: 8 }}
                        preview={false}
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
            title: "Message",
            dataIndex: "message",
            key: "message",
            ellipsis: true,
            editable: true,
        },
        {
            title: "출고날짜",
            dataIndex: "createdDate",
            key: "createdDate",
            width: 140,
            editable: true,
            render: (v) => (v ? v : <Text type="secondary">-</Text>),
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
                            <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(url)} />
                        </Tooltip>
                        <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>{url}</Text>
                    </Space>
                ) : <Tag>none</Tag>,
        },
        {
            title: "Action",
            key: "action",
            width: 200,
            render: (_, record) => {
                const editing = isEditing(record);
                return editing ? (
                    <Space>
                        <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => save(record.key)}>저장</Button>
                        <Popconfirm title="수정 취소?" onConfirm={cancel}>
                            <Button danger icon={<CloseOutlined />} size="small">취소</Button>
                        </Popconfirm>
                    </Space>
                ) : (
                    <Space wrap>
                        <Button icon={<EditOutlined />} size="small" onClick={() => edit(record)}>수정</Button>
                        <Button icon={<DownloadOutlined />} size="small" onClick={() => downloadImage(record)}>이미지 다운로드</Button>
                    </Space>
                );
            },
        },
    ];

    const mergedColumns = useMemo(() => columns.map((col) => {
        if (!col.editable) return col;
        return {
            ...col,
            onCell: (record) => ({
                record,
                inputType: col.dataIndex === "createdDate" ? "date" : "text",
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    }), [columns, editingKey]);

    return (
        <div style={{ padding: 16 }}>
            {error && (
                <Alert
                    type="error"
                    message="목록 조회 오류"
                    description={String(error)}
                    style={{ marginBottom: 12 }}
                    showIcon
                />
            )}

            <Form form={form} component={false}>
                {/* 서버가 내려준 현재 page의 전량을 그대로 표시 */}
                <Table
                    rowKey="serial"
                    loading={loading}
                    components={{ body: { cell: EditableCell } }}
                    columns={mergedColumns}
                    dataSource={rows}
                    pagination={false}
                    size="middle"
                />
            </Form>

            {/* 페이지 컨트롤 (page만 서버로 보냄) */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 12 }}>
                <Button onClick={loadPrev} disabled={loading || (page ?? 0) <= 0}>이전 페이지</Button>
                <Text>현재 페이지: {(page ?? 0) + 1}</Text>
                <Button onClick={loadNext} loading={loading}>다음 페이지</Button>

                <div style={{ width: 1, height: 16, background: "#eee", margin: "0 8px" }} />
                <Button onClick={loadMoreAppend} loading={loading} disabled={!hasMore}>
                    {hasMore ? "더 불러오기(누적)" : "더 이상 데이터 없음"}
                </Button>

                {typeof total === "number" && (
                    <Text type="secondary">
                        &nbsp;현재 표시 {items.length.toLocaleString()} / 총 {total.toLocaleString()}
                    </Text>
                )}
            </div>
        </div>
    );
}
