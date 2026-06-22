import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { LogoBrandForm } from "../platform-forms";

export default async function LogoBrandPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo Brand</CardTitle>
        <CardDescription>
          Logo platform di header situs publik, login, dan sidebar superadmin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoBrandForm defaults={settings} />
      </CardContent>
    </Card>
  );
}
