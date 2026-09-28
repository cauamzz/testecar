import { requireAdmin } from "@/lib/auth";
import { SettingsEditor } from "@/components/admin/settings-editor";
import type { Settings } from "@/lib/types";
export default async function SettingsPage() {
  const { client } = await requireAdmin("settings.write");
  const { data, error } = await client
    .from("site_settings")
    .select("instagram,facebook,whatsapp")
    .eq("id", 1)
    .single();
  if (error) throw new Error("Não foi possível consultar as configurações.");
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Redes sociais e WhatsApp.</h1>
          <p>Escolha os canais pelos quais seus clientes falam com a loja.</p>
        </div>
      </div>
      <SettingsEditor settings={data as Settings} />
    </>
  );
}
