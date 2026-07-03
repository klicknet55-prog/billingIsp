import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { SuperadminAccountForm } from "../superadmin-account-form";

export default async function SuperadminAkunPage() {
  const user = await requireUser(["superadmin"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akun Saya</CardTitle>
        <CardDescription>
          Ubah nama, email login, nomor HP, dan kata sandi akun superadmin Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SuperadminAccountForm
          defaults={{
            nama: user.nama,
            email: user.email,
            phone: user.phone,
          }}
        />
      </CardContent>
    </Card>
  );
}
