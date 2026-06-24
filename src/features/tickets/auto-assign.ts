import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { haversineKm } from "@/lib/geo/haversine";
import { db } from "@/lib/db";
import { pelanggan, ticketAssignments, tickets, users } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

/** Tetapkan teknisi terdekat ke pelanggan tiket; fallback: teknisi dengan tiket aktif paling sedikit. */
export async function autoAssignNearestTeknisi(
  tenantId: string,
  ticketId: string,
  pelangganId: string
): Promise<string | null> {
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
    columns: { latitude: true, longitude: true },
  });
  if (!cust) return null;

  const teknisiList = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.role, "teknisi"),
      eq(users.isActive, true)
    ),
  });
  if (teknisiList.length === 0) return null;

  let chosen: (typeof teknisiList)[0] | null = null;

  if (cust.latitude != null && cust.longitude != null) {
    const withCoords = teknisiList.filter((t) => t.latitude != null && t.longitude != null);
    if (withCoords.length > 0) {
      chosen = withCoords.reduce((best, t) => {
        const d = haversineKm(
          cust.latitude!,
          cust.longitude!,
          t.latitude!,
          t.longitude!
        );
        const bestD = haversineKm(
          cust.latitude!,
          cust.longitude!,
          best.latitude!,
          best.longitude!
        );
        return d < bestD ? t : best;
      });
    }
  }

  if (!chosen) {
    const counts = await db
      .select({
        userId: ticketAssignments.userId,
        n: sql<number>`count(*)`,
      })
      .from(ticketAssignments)
      .innerJoin(tickets, eq(ticketAssignments.ticketId, tickets.id))
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`${tickets.status} IN ('open', 'in_progress')`
        )
      )
      .groupBy(ticketAssignments.userId);

    const countMap = new Map(counts.map((c) => [c.userId, Number(c.n)]));
    chosen = teknisiList.reduce((best, t) => {
      const a = countMap.get(t.id) ?? 0;
      const b = countMap.get(best.id) ?? 0;
      return a < b ? t : best;
    });
  }

  await db.delete(ticketAssignments).where(eq(ticketAssignments.ticketId, ticketId));
  await db.insert(ticketAssignments).values({
    id: newId("asg"),
    ticketId,
    userId: chosen.id,
  });
  return chosen.id;
}
