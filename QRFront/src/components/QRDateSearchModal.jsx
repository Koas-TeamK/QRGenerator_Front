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
    qrUpdateRequest, qrUpdateSuccess,
    // ▼ 시리얼 범위 전용 검색 액션 (사가에서 /api/admin/search/serial 호출)
    qrSearchSerialRequest,
} from "@/features/qr/qrSlice";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
    const [filterForm] = Form.useForm(); // 날짜/시리얼 범위 선택용
    const [editForm] = Form.useForm();   // 테이블 인라인 편집용

    // 로컬 표시 버퍼
    const [rows, setRows] = useState([]);
    useEffect(() => { setRows(items); }, [items]);

    // 테이블 선택된 행 키(시리얼) 관리 → ZIP 다운로드에 사용
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const onSelectChange = (keys) => setSelectedRowKeys(keys);

    // 열릴 때 초기화
    useEffect(() => {
        if (!open) return;
        dispatch(qrSearchReset());
        // ▼ 필드명: startSerial / endSerial 로 통일
        filterForm.setFieldsValue({ dateRange: [], startSerial: "", endSerial: "" });
        setSelectedRowKeys([]);
    }, [open, dispatch, filterForm]);

    // 이미지 한 장을 Blob으로 얻는 유틸
    const getImageBlob = async (record) => {
        const { imageUrl } = record;
        const src = toImageSrc(imageUrl);
        if (!src) return null;

        if (src.startsWith("data:image")) {
            const res = await fetch(src);
            return await res.blob();
        }
        const res = await fetch(src, { mode: "cors" });
        if (!res.ok) return null;
        return await res.blob();
    };

    // 선택/전체 결과를 ZIP으로 다운로드
    const downloadZipAll = async () => {
        try {
            const target = selectedRowKeys.length
                ? rows.filter((r) => selectedRowKeys.includes(r.serial))
                : rows;

            if (!target.length) {
                antdMessage.warning("다운로드할 항목이 없습니다. (선택하거나, 검색 결과가 있어야 합니다)");
                return;
            }

            const zip = new JSZip();
            const folder = zip.folder("qrs");
            const tasks = target.map(async (r) => {
                const blob = await getImageBlob(r);
                if (!blob) return;
                const filename = `qr_${r.serial || "image"}.png`;
                folder.file(filename, blob);
            });

            antdMessage.loading({ content: "ZIP 준비 중...", key: "zip" });
            await Promise.all(tasks);

            const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            const serials = target.map(r => r?.serial).filter(Boolean).map(s => String(s).trim());
            const safe = (s) => (s ?? "").toString().replace(/[\\/:*?"<>|]/g, "").trim();

            let startStr = "start", endStr = "end";
            if (serials.length) {
                const withNum = serials.map(s => ({ s, n: Number(s.replace(/[^0-9]/g, "")) }));
                const allNumeric = withNum.every(x => Number.isFinite(x.n));
                if (allNumeric) {
                    const min = withNum.reduce((a, b) => (b.n < a.n ? b : a));
                    const max = withNum.reduce((a, b) => (b.n > a.n ? b : a));
                    startStr = min.s; endStr = max.s;
                } else {
                    const sorted = [...serials].sort((a, b) =>
                        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
                    );
                    startStr = sorted[0];
                    endStr = sorted[sorted.length - 1];
                }
            }

            const zipName = `qr_${safe(startStr)}-${safe(endStr)}.zip`;
            saveAs(content, zipName);
            antdMessage.success({ content: "ZIP 다운로드 완료", key: "zip" });
        } catch (e) {
            console.error(e);
            antdMessage.error({ content: "ZIP 생성 중 오류가 발생했습니다.", key: "zip" });
        }
    };

    //제로 패딩
    const normalizeSerial4 = (val) => {
        if (val == null) return "";
        const digits = String(val).replace(/\D/g, "");     // 숫자만 추출
        if (!digits) return "";
        const n = Number(digits);
        if (!Number.isFinite(n)) return "";
        return String(n).padStart(4, "0");                 // 항상 4자리 문자열
    };

    /**
     * 🔎 검색 트리거
     * - startSerial/endSerial 사용으로 통일
     * - 시리얼이 하나라도 있으면 시리얼 전용 API 호출 액션으로 디스패치
     * - 아니면 기존 날짜 검색 액션으로 디스패치
     */
    const onSearch = useCallback(async () => {
        const vals = await filterForm.validateFields().catch(() => null);
        if (!vals) return;

        const dr = vals.dateRange || [];
        const start = dr[0] ? dr[0].format("YYYY-MM-DD") : undefined;
        const end = dr[1] ? dr[1].format("YYYY-MM-DD") : undefined;

        // 원시 입력값 → 트리밍
        const rawStart = vals.startSerial?.toString().trim();
        const rawEnd = vals.endSerial?.toString().trim();

        // ▼▼ 4자리 zero-padding **문자열**로 정규화
        const startSerial = normalizeSerial4(rawStart);  // "1" → "0001"
        const endSerial = normalizeSerial4(rawEnd);    // "20" → "0020"

        if (!start && !end && !startSerial && !endSerial) {
            antdMessage.warning("날짜 또는 시리얼 범위를 입력하세요.");
            return;
        }

        if (startSerial || endSerial) {
            dispatch(qrSearchSerialRequest({ startSerial, endSerial }))
        } else {
            const payload = {};
            if (start) payload.startDate = start;
            if (end) payload.endDate = end;
            dispatch(qrSearchRequest(payload));
        }

        setSelectedRowKeys([]); // 새 검색 시 선택 초기화
    }, [dispatch, filterForm]);

    const onReset = () => {
        filterForm.resetFields();
        dispatch(qrSearchReset());
        setSelectedRowKeys([]);
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

    //QR URL 다운로드
    const downloadExcelUrls = () => {
        const target = selectedRowKeys.length
            ? rows.filter((r) => selectedRowKeys.includes(r.serial))
            : rows;

        if (!target.length) {
            antdMessage.warning("다운로드할 항목이 없습니다. (선택하거나, 검색 결과가 있어야 합니다)");
            return;
        }

        try {
            // 1. CSV 헤더 정의 (Excel에서 보일 열 제목)
            const headers = ["Serial", "QR URL"];

            // 2. 데이터 행 생성
            const csvRows = target.map(r =>
                `${r.serial}, ${r.qrUrl}`
            );

            // 3. 전체 CSV 문자열 생성 (헤더 + 행들)
            const csvString = [
                headers.join(","), // 헤더를 쉼표로 연결
                ...csvRows         // 데이터 행 추가
            ].join("\n");          // 행들을 줄바꿈 문자로 연결

            // 4. Blob 생성 및 파일 다운로드
            // BOM(Byte Order Mark)을 추가하여 한글 깨짐 방지
            const bom = "\uFEFF";
            const blob = new Blob([bom + csvString], { type: "text/csv;charset=utf-8;" });

            // 파일 이름 결정
            const serials = target.map(r => r?.serial).filter(Boolean).map(s => String(s).trim());
            const safe = (s) => (s ?? "").toString().replace(/[\\/:*?"<>|]/g, "").trim();
            let startStr = "start", endStr = "end";
            if (serials.length) {
                // 시리얼 범위 계산 로직 (downloadZipAll에서 재사용)
                const withNum = serials.map(s => ({ s, n: Number(s.replace(/[^0-9]/g, "")) }));
                const allNumeric = withNum.every(x => Number.isFinite(x.n));
                if (allNumeric) {
                    const min = withNum.reduce((a, b) => (b.n < a.n ? b : a));
                    const max = withNum.reduce((a, b) => (b.n > a.n ? b : a));
                    startStr = min.s; endStr = max.s;
                } else {
                    const sorted = [...serials].sort((a, b) =>
                        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
                    );
                    startStr = sorted[0];
                    endStr = sorted[sorted.length - 1];
                }
            }
            const fileName = `qr_urls_${safe(startStr)}-${safe(endStr)}.csv`;

            saveAs(blob, fileName);
            antdMessage.success("QR URL CSV 다운로드 완료");
        } catch (e) {
            console.error(e);
            antdMessage.error("CSV 생성 중 오류가 발생했습니다.");
        }
    };

    return (
        <Modal
            title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 30px" }}>
                    <Space size="middle">
                        <CalendarOutlined />
                        <span style={{ fontWeight: 600 }}>QR 검색 (날짜/시리얼)</span>
                        <Text type="secondary">{items.length ? `총 ${items.length.toLocaleString()}건` : null}</Text>
                    </Space>
                    <Space size="small" wrap>
                        {/* ZIP 다운로드 버튼 (선택이 있으면 선택분만, 없으면 전체) */}
                        <Tooltip title={selectedRowKeys.length ? "선택 항목 다운로드" : "전체 다운로드"}>
                            <Button size="small" onClick={downloadExcelUrls} icon={<DownloadOutlined />}>
                                QR URL
                            </Button>
                            <Button size="small" onClick={downloadZipAll} icon={<DownloadOutlined />}>
                                이미지 ZIP
                            </Button>
                        </Tooltip>
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
            {/* 날짜/시리얼 범위 선택 */}
            <div style={{ padding: 12, border: "1px solid #f0f0f0", borderRadius: 12, background: "#fafafa", marginBottom: 12 }}>
                <Form
                    form={filterForm}
                    layout="vertical"
                    onFinish={onSearch}
                >
                    <Row gutter={12} align="bottom">
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={<Space size={6} style={{ fontWeight: 500 }}><CalendarOutlined /> 출고날짜 범위</Space>}
                                name="dateRange"
                                tooltip="하나만 선택하면 해당 일자만 검색"
                            >
                                <RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" allowEmpty={[true, true]} allowClear />
                            </Form.Item>
                        </Col>

                        {/* ▼ 시리얼 범위 입력 (필드명: startSerial / endSerial 로 통일) */}
                        <Col xs={24} md={12}>
                            <Row gutter={8}>
                                <Col span={12}>
                                    <Form.Item
                                        label="시리얼 시작"
                                        name="startSerial"
                                        tooltip="예: 0001 또는 1"
                                    >
                                        <Input placeholder="예: 0001" allowClear />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="시리얼 끝"
                                        name="endSerial"
                                        tooltip="예: 0500 또는 500"
                                    >
                                        <Input placeholder="예: 0500" allowClear />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Col>

                        <Col xs={24} md={24} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
                    rowSelection={{
                        selectedRowKeys,
                        onChange: onSelectChange,
                        preserveSelectedRowKeys: true,
                    }}
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
