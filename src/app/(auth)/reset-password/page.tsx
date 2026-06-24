import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const qs = await searchParams;
  const token = qs.token ?? "";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Atur Kata Sandi Baru</CardTitle>
        <CardDescription>Tautan berlaku 1 jam sejak dikirim.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
