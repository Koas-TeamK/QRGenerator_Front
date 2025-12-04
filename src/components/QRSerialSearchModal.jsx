// components/QRSerialSearchModal.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Modal, Input, Space, Table, Tag, Typography, Tooltip, Button, Image, Form,
    DatePicker, Popconfirm, message as antdMessage
} from "antd";
import {
    NumberOutlined, SearchOutlined, LinkOutlined, CopyOutlined,
    EditOutlined, CheckOutlined, CloseOutlined, DownloadOutlined
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
    qrSearchClose, qrSearchRequest, selectQrSearch,
    qrUpdateRequest, qrUpdateSuccess
} from "@/features/qr/qrSlice";

const { Text } = Typography;

const toImageSrc = (val) =>
    val ? (val.startsWith("http") ? val : `data:image/png;base64,${val}`) : "";

// 1~4자리 숫자만 허용 (AppLayout 형식과 동일)
const parseSerial = (value) => {
    const s = String(value || "").trim();
    if (!/^\d{1,4}$/.test(s)) return null;
    return s; // 필요 시 s.padStart(4, "0") 가능
};

// QRList와 동일한 인라인 편집 셀
const EditableCell = ({ editing, dataIndex, title, record, children, ...rest }) => {
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

export default function QRSerialSearchModal() {
    const dispatch = useDispatch();
    const { open, items = [], loading, error } = useSelector(selectQrSearch);

    // 권한: ADMIN만 수정 가능
    const { myRole } = useSelector((s) => s.user || {});
    const role = typeof myRole === "string" ? myRole : myRole?.role;
    const isAdmin = role === "ADMIN";

    // 로컬 버퍼(표시용) & 에디팅 상태
    const [rows, setRows] = useState([]);
    useEffect(() => { setRows(items); }, [items]);

    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState("");
    const isEditing = (record) => record.serial === editingKey;

    // 검색: payload = { serial }
    const handleSearch = useCallback((value) => {
        const serial = parseSerial(value);
        if (!serial) {
            antdMessage.warning("형식: 숫자 1~4자리 (예: 0001)");
            return;
        }
        dispatch(qrSearchRequest({ serial }));
    }, [dispatch]);

    // 복사 / 이미지 다운로드
    const copy = async (text) => {
        try { await navigator.clipboard.writeText(text); antdMessage.success("복사 완료"); }
        catch { window.prompt("Copy this:", text); }
    };

    const downloadImage = async (record) => {
        const { imageUrl, serial } = record;
        if (!imageUrl) { antdMessage.warning("이미지가 없습니다."); return; }
        const filename = `qr_${serial || "image"}.png`;
        try {
            const src = toImageSrc(imageUrl);
            if (src.startsWith("data:image")) {
                const a = document.createElement("a");
                a.href = src; a.download = filename; a.click();
            } else {
                const res = await fetch(src, { mode: "cors" });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            window.open(toImageSrc(imageUrl), "_blank", "noopener,noreferrer");
        }
    };

    // 편집 핸들러 (QRList와 동일한 흐름)
    const edit = (record) => {
        form.setFieldsValue({
            message: record.message,
            createdDate: record.createdDate ? dayjs(record.createdDate) : null,
        });
        setEditingKey(record.serial);
    };
    const cancel = () => setEditingKey("");

    const save = async (serialKey) => {
        try {
            const row = await form.validateFields();
            const createdDateStr = row.createdDate ? row.createdDate.format("YYYY-MM-DD") : "";
            const original = rows.find((d) => d.serial === serialKey);
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

            // 1) 로컬 반영
            setRows((prev) => prev.map((r) => (r.serial === serialKey ? { ...r, ...dto } : r)));
            setEditingKey("");

            // 2) 스토어 낙관적 패치 (slice는 top-level items만 건드리지만 일단 동일하게 사용)
            dispatch(qrUpdateSuccess(dto));

            // 3) 서버 동기화
            dispatch(qrUpdateRequest(dto));
        } catch {
            // no-op
        }
    };

    // QRList와 동일한 열 구성 + Action
    const columns = useMemo(() => ([
        {
            title: "QR",
            dataIndex: "imageUrl",
            key: "imageUrl",
            width: 90,
            render: (src, record) =>
                src ? (
                    <Image
                        src={toImageSrc(src)}
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
            render: (v) => v || <Text type="secondary">-</Text>,
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
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(url)} />
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
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            size="small"
                            onClick={() => save(record.serial)}
                        >
                            저장
                        </Button>
                        <Popconfirm title="수정 취소?" onConfirm={cancel}>
                            <Button danger icon={<CloseOutlined />} size="small">취소</Button>
                        </Popconfirm>
                    </Space>
                ) : (
                    <Space wrap>
                        {isAdmin && (
                            <Button icon={<EditOutlined />} size="small" onClick={() => edit(record)}>
                                수정
                            </Button>
                        )}
                        <Button icon={<DownloadOutlined />} size="small" onClick={() => downloadImage(record)}>
                            이미지 다운로드
                        </Button>
                    </Space>
                );
            },
        },
    ]), [isAdmin, editingKey]);

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
        <Modal
            title={
                <Space size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space>
                        <NumberOutlined />
                        <span>Serial 검색</span>
                        <Text type="secondary">{rows?.length ? `총 ${rows.length.toLocaleString()}건` : null}</Text>
                    </Space>
                    {/* 모달 헤더 검색 */}
                    <Input.Search
                        placeholder="시리얼: 4자리수 입력"
                        enterButton={<><SearchOutlined /> 검색</>}
                        onSearch={handleSearch}
                        allowClear
                        style={{ minWidth: 280, width: 360 }}
                    />
                </Space>
            }
            open={open}
            onCancel={() => dispatch(qrSearchClose())}
            width={960}
            destroyOnClose
            footer={null}
        >
            <Form form={form} component={false}>
                <Table
                    style={{ marginTop: 8 }}
                    rowKey="serial"
                    size="middle"
                    components={{ body: { cell: EditableCell } }}
                    columns={mergedColumns}
                    dataSource={rows}
                    loading={loading}
                    pagination={false}
                />
            </Form>
            {error && <div style={{ color: '#d4380d', marginTop: 8 }}>오류: {String(error)}</div>}
        </Modal>
    );
}
