// components/QRDateSearchModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Modal, Form, DatePicker, Row, Col,
    Button, Space, Table, Tag, Typography, Tooltip, Image, Input, Popconfirm,
    message as antdMessage
} from "antd";
import {
    CalendarOutlined, SearchOutlined, ReloadOutlined, LinkOutlined, CopyOutlined,
    EditOutlined, CheckOutlined, CloseOutlined, DownloadOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import {
    qrSearchRequest, qrSearchReset, selectQrSearch,
    qrUpdateRequest, qrUpdateSuccess
} from "@/features/qr/qrSlice";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const toImageSrc = (val) => (val ? (val.startsWith("http") ? val : `data:image/png;base64,${val}`) : "");

// 인라인 편집 셀 (편집 Form 전용)
const EditableCell = ({ editing, dataIndex, children, ...rest }) => {
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

export default function QRDateSearchModal({ open, onClose }) {
    const dispatch = useDispatch();
    const { items = [], loading, error } = useSelector(selectQrSearch);
    const { myRole } = useSelector((s) => s.user || {});
    const role = typeof myRole === "string" ? myRole : myRole?.role;
    const isAdmin = role === "ADMIN";

    // 서로 다른 Form 인스턴스
    const [filterForm] = Form.useForm(); // 날짜 범위 선택용
    const [editForm] = Form.useForm();   // 테이블 인라인 편집용

    // 로컬 표시 버퍼
    const [rows, setRows] = useState([]);
    useEffect(() => { setRows(items); }, [items]);

    // 열릴 때 초기화
    useEffect(() => {
        if (!open) return;
        dispatch(qrSearchReset());
        filterForm.setFieldsValue({ dateRange: [] });
    }, [open, dispatch, filterForm]);

    // startDate/endDate만 전송
    const onSearch = useCallback(async () => {
        const vals = await filterForm.validateFields().catch(() => null);
        if (!vals) return;

        const dr = vals.dateRange || [];
        const start = dr[0] ? dr[0].format("YYYY-MM-DD") : undefined;
        const end = dr[1] ? dr[1].format("YYYY-MM-DD") : undefined;

        if (!start && !end) {
            antdMessage.warning("날짜를 선택하세요 (시작 또는 종료)");
            return;
        }

        const payload = {};
        if (start) payload.startDate = start;
        if (end) payload.endDate = end;

        //console.log("[QRDateSearchModal] onSearch ▶ payload:", payload);
        dispatch(qrSearchRequest(payload));
    }, [dispatch, filterForm]);

    const onReset = () => {
        filterForm.resetFields();
        dispatch(qrSearchReset());
        //console.log("[QRDateSearchModal] reset");
    };

    const quickDate = (type) => {
        const today = dayjs();
        if (type === "today") filterForm.setFieldsValue({ dateRange: [today, today] });
        if (type === "7d") filterForm.setFieldsValue({ dateRange: [today.subtract(6, "day"), today] });
        if (type === "30d") filterForm.setFieldsValue({ dateRange: [today.subtract(29, "day"), today] });
    };

    const copy = async (text) => {
        try { await navigator.clipboard.writeText(text); antdMessage.success("복사됨"); }
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

    // 인라인 편집
    const [editingKey, setEditingKey] = useState("");
    const isEditing = (record) => record.serial === editingKey;

    const edit = (record) => {
        editForm.setFieldsValue({
            message: record.message,
            createdDate: record.createdDate ? dayjs(record.createdDate) : null,
        });
        setEditingKey(record.serial);
    };
    const cancel = () => setEditingKey("");

    const save = async (serialKey) => {
        try {
            const row = await editForm.validateFields();
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

            setRows((prev) => prev.map((r) => (r.serial === serialKey ? { ...r, ...dto } : r)));
            setEditingKey("");
            dispatch(qrUpdateSuccess(dto));
            dispatch(qrUpdateRequest(dto));
            //console.log("[QRDateSearchModal] save ▶ dto:", dto);
        } catch { /* no-op */ }
    };

    // 컬럼 (Item 제거, QRList와 동일)
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
                        <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => save(record.serial)}>
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
                dataIndex: col.dataIndex,
                editing: isEditing(record),
            }),
        };
    }), [columns, editingKey]);

    return (
        <Modal
            title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <Space size="middle">
                        <CalendarOutlined />
                        <span style={{ fontWeight: 600 }}>QR 검색 (날짜)</span>
                        <Text type="secondary">{items.length ? `총 ${items.length.toLocaleString()}건` : null}</Text>
                    </Space>
                    <Space size="small" wrap>
                        <Button size="small" type="text" onClick={() => quickDate("today")}>오늘</Button>
                        <Button size="small" type="text" onClick={() => quickDate("7d")}>최근 7일</Button>
                        <Button size="small" type="text" onClick={() => quickDate("30d")}>최근 30일</Button>
                    </Space>
                </div>
            }
            open={open}
            onCancel={onClose}
            width={1000}
            destroyOnClose
            footer={null}
        >
            {/* 날짜 범위 선택 */}
            <div style={{ padding: 12, border: "1px solid #f0f0f0", borderRadius: 12, background: "#fafafa", marginBottom: 12 }}>
                <Form
                    form={filterForm}
                    layout="vertical"
                    onFinish={() => {
                        //console.log("[QRDateSearchModal] form submit");
                        onSearch();
                    }}
                >
                    <Row gutter={12} align="bottom">
                        <Col xs={24} md={18}>
                            <Form.Item
                                label={<Space size={6} style={{ fontWeight: 500 }}><CalendarOutlined /> 출고날짜 범위</Space>}
                                name="dateRange"
                                tooltip="하나만 선택하면 해당 일자만 검색"
                            >
                                <RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" allowEmpty={[true, true]} allowClear />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={onReset}>초기화</Button>
                                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                                    검색
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </div>

            {/* 결과 테이블 (페이지네이션 제거) */}
            <Form form={editForm} component={false}>
                <Table
                    style={{ marginTop: 8 }}
                    rowKey="serial"
                    size="middle"
                    components={{ body: { cell: EditableCell } }}
                    columns={mergedColumns}
                    dataSource={rows}
                    loading={loading}
                    pagination={false}
                    scroll={{ y: 420 }}
                    sticky
                />
            </Form>

            {error && (
                <div style={{
                    color: '#d4380d', marginTop: 12,
                    border: "1px solid #ffd8bf", background: "#fff2e8",
                    borderRadius: 8, padding: 8
                }}>
                    오류: {String(error)}
                </div>
            )}
        </Modal>
    );
}
