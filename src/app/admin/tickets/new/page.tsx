import Link from "next/link";
import { requireAuthor } from "@/lib/auth/session";
import TicketForm from "@/components/admin/TicketForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  await requireAuthor();

  return (
    <div>
      <div className="page-head">
        <h1>アイデアを追加</h1>
        <Link className="btn-sm" href="/admin/tickets">
          一覧へ戻る
        </Link>
      </div>
      <TicketForm />
    </div>
  );
}
