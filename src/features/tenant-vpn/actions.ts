"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import {
  createTenantVpn,
  deleteTenantVpn,
  revealTenantVpnPassword,
  toggleTenantVpn,
} from "./service";

export type VpnActionState = ActionState & {
  created?: {
    id: string;
    vpnUsername: string;
    password: string;
    staticIp: string;
    endpoint: string;
    destinationPort: number;
  };
  password?: string;
};

export async function createTenantVpnAction(
  _prev: VpnActionState,
  formData: FormData
): Promise<VpnActionState> {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const label = String(formData.get("label") ?? "").trim();
  const destinationRaw = String(formData.get("destinationPort") ?? "443");
  const destinationPort = destinationRaw === "8728" ? 8728 : 443;

  if (label.length > 80) {
    return { error: "Label maksimal 80 karakter." };
  }

  try {
    const created = await createTenantVpn({ tenantId, label: label || undefined, destinationPort });
    revalidatePath("/dashboard/vpn");
    revalidatePath("/dashboard/router");
    return {
      ok: true,
      created: {
        id: created.id,
        vpnUsername: created.vpnUsername,
        password: created.password,
        staticIp: created.staticIp,
        endpoint: created.endpoint,
        destinationPort: created.destinationPort,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat akun VPN.";
    return { error: msg };
  }
}

export async function deleteTenantVpnAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  try {
    await deleteTenantVpn(user.tenantId!, id);
    revalidatePath("/dashboard/vpn");
    revalidatePath("/dashboard/router");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus akun VPN.";
    throw new Error(msg);
  }
}

export async function toggleTenantVpnAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  if (!id) return;

  try {
    await toggleTenantVpn(user.tenantId!, id, enabled);
    revalidatePath("/dashboard/vpn");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengubah status VPN.";
    throw new Error(msg);
  }
}

export async function revealTenantVpnPasswordAction(
  _prev: VpnActionState,
  formData: FormData
): Promise<VpnActionState> {
  const user = await requireUser(["owner", "admin"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Akun VPN tidak valid." };

  try {
    const password = await revealTenantVpnPassword(user.tenantId!, id);
    return { ok: true, password };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membaca password VPN.";
    return { error: msg };
  }
}
