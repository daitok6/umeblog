import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getSessionUser } from "@/lib/auth/session";
import "../admin/admin.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <div className="login-wrap">
      <div className="login-card frame">
        <h1 className="login-title">うめ</h1>
        <p className="label" style={{ marginBottom: "1.5rem" }}>
          管理画面
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
