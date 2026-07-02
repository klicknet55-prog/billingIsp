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
import { autoAssignNearestTeknisi } from "./auto-assign";
import { notifyTicketEvent } from "@/features/notifications/push-sender";

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
  input: {
    pelangganId: string;
    judul: string;
    deskripsi?: string | null;
    fotoUrl?: string | null;
    autoAssign?: boolean;
  }
) {
  const ticketId = newId("tkt");
  await db.insert(tickets).values({
    id: ticketId,
    tenantId,
    pelangganId: input.pelangganId,
    judul: input.judul,
    deskripsi: input.deskripsi ?? null,
    fotoUrl: input.fotoUrl ?? null,
    status: "open",
  });
  if (input.autoAssign !== false) {
    await autoAssignNearestTeknisi(tenantId, ticketId, input.pelangganId);
  }
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, input.pelangganId)),
    columns: { nama: true },
  });
  void notifyTicketEvent({
    tenantId,
    pelangganNama: cust?.nama ?? "Pelanggan",
    ticketId,
    title: "Tiket gangguan baru",
    body: input.judul,
  });
  return ticketId;
}

export async function updateTeknisiLocation(
  tenantId: string,
  userId: string,
  latitude: number,
  longitude: number
) {
  await db
    .update(users)
    .set({ latitude, longitude })
    .where(and(eq(users.tenantId, tenantId), eq(users.id, userId), eq(users.role, "teknisi")));
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
  const row = await db
    .select({ pelangganNama: pelanggan.nama, judul: tickets.judul })
    .from(tickets)
    .innerJoin(pelanggan, eq(tickets.pelangganId, pelanggan.id))
    .where(and(eq(tickets.tenantId, tenantId), eq(tickets.id, id)))
    .limit(1);
  const item = row[0];
  if (!item) return;
  void notifyTicketEvent({
    tenantId,
    pelangganNama: item.pelangganNama,
    ticketId: id,
    title: "Update tiket gangguan",
    body: `${item.judul} (${status})`,
  });
}

export async function assignTicket(ticketId: string, userId: string) {
  await db.delete(ticketAssignments).where(eq(ticketAssignments.ticketId, ticketId));
  await db.insert(ticketAssignments).values({ id: newId("asg"), ticketId, userId });
  const row = await db
    .select({
      tenantId: tickets.tenantId,
      pelangganNama: pelanggan.nama,
      judul: tickets.judul,
    })
    .from(tickets)
    .innerJoin(pelanggan, eq(tickets.pelangganId, pelanggan.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);
  const item = row[0];
  if (!item) return;
  void notifyTicketEvent({
    tenantId: item.tenantId,
    pelangganNama: item.pelangganNama,
    ticketId,
    title: "Assignment tiket",
    body: item.judul,
  });
}

export async function listTeknisi(tenantId: string) {
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "teknisi")),
  });
}
