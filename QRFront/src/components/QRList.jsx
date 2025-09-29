// src/pages/QRList.jsx
import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Table, Image, Space, Button, Tooltip, Tag, Typography, Alert, Form, Input, DatePicker, Popconfirm, message as antdMessage
} from "antd";
import {
    DownloadOutlined, EditOutlined, CheckOutlined, CloseOutlined, CopyOutlined, LinkOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { selectQr, qrUpdateRequest } from "@/features/qr/qrSlice";

const { Text } = Typography;

// Editable cell for message / createdDate
const EditableCell = ({ editing, dataIndex, title, inputType, record, children, ...rest }) => {
    let inputNode = null;
    if (dataIndex === "message") {
        inputNode = <Input placeholder="메시지" maxLength={200} />;
    } else if (dataIndex === "createdDate") {
        inputNode = <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />;
    } else {
        inputNode = <Input />;
    }

    return (
        <td {...rest}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={
                        dataIndex === "createdDate"
                            ? [{ required: true, message: "출고날짜를 선택하세요" }]
                            : undefined
                    }
                >
                    {inputNode}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

export default function QRList() {
    const dispatch = useDispatch();
    const { items = [], saving, error } = useSelector(selectQr);

    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState("");

    const isEditing = (record) => record.key === editingKey;

    const data = useMemo(
        () =>
            items.map((it, idx) => ({
                key: String(it.id ?? it.serial ?? it.code ?? idx),
                serial: it.serial ?? it.code ?? "",
                itemName: it.itemName ?? it.product ?? "",
                message: it.message ?? "",
                createdDate: it.createdDate ?? "",
                qrUrl: it.qrUrl ?? it.url ?? "",
                imageUrl: it.imageUrl ?? "", // dataURL 또는 http(s) URL
            })),
        [items]
    );

    const onCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            antdMessage.success("복사 완료");
        } catch {
            window.prompt("Copy this:", text);
        }
    };

    const downloadImage = async (record) => {
        const { imageUrl, serial } = record;
        if (!imageUrl) {
            antdMessage.warning("이미지가 없습니다.");
            return;
        }
        const filename = `qr_${serial || "image"}.png`;

        try {
            if (imageUrl.startsWith("data:image")) {
                const a = document.createElement("a");
                a.href = imageUrl;
                a.download = filename;
                a.click();
            } else {
                const res = await fetch(imageUrl, { mode: "cors" });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            // CORS 등으로 실패하면 새 탭으로라도 열기
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

            const original = data.find((d) => d.key === key);
            if (!original) return;

            const dto = {
                // 백엔드 QrRequestDto 스펙
                imageUrl: original.imageUrl,  // 그대로 유지
                qrUrl: original.qrUrl,
                serial: original.serial,
                message: row.message ?? "",
                createdDate: createdDateStr,
                itemName: original.itemName,
            };

            // 업데이트 요청 (PUT /api/qr/{serial} 가정)
            dispatch(qrUpdateRequest(dto));

            setEditingKey("");
        } catch (err) {
            // validation 실패
        }
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
                        fallback=""
                        preview={false}
                    />
                ) : (
                    <Tag>no image</Tag>
                ),
        },
        {
            title: "Serial",
            dataIndex: "serial",
            key: "serial",
            width: 120,
            sorter: (a, b) => String(a.serial).localeCompare(String(b.serial)),
            render: (v) => <Text code>{v}</Text>,
        },
        {
            title: "Item",
            dataIndex: "itemName",
            key: "itemName",
            width: 160,
            ellipsis: true,
            render: (v) => (v ? v : <Text type="secondary">-</Text>),
        },
        {
            title: "Message",
            dataIndex: "message",
            key: "message",
            ellipsis: true,
            editable: true,
            render: (v) => (v ? v : <Text type="secondary">-</Text>),
        },
        {
            title: "출고날짜",
            dataIndex: "createdDate",
            key: "createdDate",
            width: 140,
            editable: true,
            sorter: (a, b) => new Date(a.createdDate) - new Date(b.createdDate),
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
                        <a href={url} target="_blank" rel="noreferrer">
                            <LinkOutlined /> Open
                        </a>
                        <Tooltip title="Copy URL">
                            <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(url)} />
                        </Tooltip>
                        <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                            {url}
                        </Text>
                    </Space>
                ) : (
                    <Tag>none</Tag>
                ),
        },
        {
            title: "Action",
            key: "action",
            width: 200,
            render: (_, record) => {
                const editing = isEditing(record);
                return editing ? (
                    <Space>
                        <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => save(record.key)}>
                            저장
                        </Button>
                        <Popconfirm title="수정 취소?" onConfirm={cancel}>
                            <Button danger icon={<CloseOutlined />} size="small">
                                취소
                            </Button>
                        </Popconfirm>
                    </Space>
                ) : (
                    <Space wrap>
                        <Button icon={<EditOutlined />} size="small" onClick={() => edit(record)}>
                            수정
                        </Button>
                        <Button icon={<DownloadOutlined />} size="small" onClick={() => downloadImage(record)}>
                            이미지 다운로드
                        </Button>
                    </Space>
                );
            },
        },
    ];

    // editable 설정
    const mergedColumns = columns.map((col) => {
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
    });

    return (
        <div style={{ padding: 16 }}>
            {error && (
                <Alert
                    type="error"
                    message="QR 저장/업데이트 오류"
                    description={String(error)}
                    style={{ marginBottom: 12 }}
                    showIcon
                />
            )}

            <Form form={form} component={false}>
                <Table
                    rowKey="key"
                    loading={saving}
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    columns={mergedColumns}
                    dataSource={data}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    size="middle"
                />
            </Form>
        </div>
    );
}
