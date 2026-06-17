import "server-only";
import { aliasedTable, and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pelanggan,
  ticketAssignments,
  tickets,
  users,
  type Ticket,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";

export interface TicketRow extends Ticket {
  pelangganNama: string;
  teknisiNama: string | null;
}

export async function listTickets(tenantId: string, pelangganId?: string): Promise<TicketRow[]> {
  const teknisi = aliasedTable(users, "teknisi");
  const rows = await db
    .select({
      t: tickets,
      pelangganNama: pelanggan.nama,
      teknisiNama: teknisi.nama,
    })
    .from(tickets)
    .innerJoin(pelanggan, eq(tickets.pelangganId, pelanggan.id))
    .leftJoin(ticketAssignments, eq(ticketAssignments.ticketId, tickets.id))
    .leftJoin(teknisi, eq(ticketAssignments.userId, teknisi.id))
    .where(
      pelangganId
        ? and(eq(tickets.tenantId, tenantId), eq(tickets.pelangganId, pelangganId))
        : eq(tickets.tenantId, tenantId)
    )
    .orderBy(desc(tickets.createdAt));
  return rows.map((r) => ({ ...r.t, pelangganNama: r.pelangganNama, teknisiNama: r.teknisiNama }));
}

export async function createTicket(
  tenantId: string,
  input: { pelangganId: string; judul: string; deskripsi?: string | null; fotoUrl?: string | null }
) {
  await db.insert(tickets).values({
    id: newId("tkt"),
    tenantId,
    pelangganId: input.pelangganId,
    judul: input.judul,
    deskripsi: input.deskripsi ?? null,
    fotoUrl: input.fotoUrl ?? null,
    status: "open",
  });
}

export async function updateTicketStatus(
  tenantId: string,
  id: string,
  status: "open" | "in_progress" | "resolved"
) {
  await db
    .update(tickets)
    .set({ status })
    .where(and(eq(tickets.tenantId, tenantId), eq(tickets.id, id)));
}

export async function assignTicket(ticketId: string, userId: string) {
  await db.delete(ticketAssignments).where(eq(ticketAssignments.ticketId, ticketId));
  await db.insert(ticketAssignments).values({ id: newId("asg"), ticketId, userId });
}

export async function listTeknisi(tenantId: string) {
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "teknisi")),
  });
}
