import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthor } from "@/lib/auth/session";
import { getById } from "@/lib/repo/tickets";
import TicketForm from "@/components/admin/TicketForm";

export const dynamic = "force-dynamic";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthor();
  const { id } = await params;
  const ticket = await getById(Number(id));
  if (!ticket) notFound();

  return (
    <div>
      <div className="page-head">
        <h1>アイデアを編集</h1>
        <Link className="btn-sm" href={`/admin/tickets/${ticket.id}`}>
          詳細へ戻る
        </Link>
      </div>
      <TicketForm ticket={ticket} />
    </div>
  );
}
