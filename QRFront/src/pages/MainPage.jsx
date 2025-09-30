import QRList from "@/components/QRList"
import { useSelector } from "react-redux";

export default function MainPage() {
    // 권한: ADMIN만 수정 가능
    const { myRole } = useSelector((s) => s.user || {});
    const role = typeof myRole === "string" ? myRole : myRole?.role;
    const isAdmin = role === "ADMIN";
    //console.log("[MainPage] isAdmin -> ", isAdmin)
    return (
        <div>
            <QRList isAdmin={isAdmin} />
        </div>
    )
}