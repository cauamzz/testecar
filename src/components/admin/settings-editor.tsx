"use client";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/app/actions";
import type { Settings, ActionResult } from "@/lib/types";
import { FormNotice } from "@/components/ui";
export function SettingsEditor({
  settings,
}: {
  settings: Pick<Settings, "instagram" | "facebook" | "whatsapp">;
}) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const digits = settings.whatsapp.replace(/\D/g, "");
  const local =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  const [ddd, setDdd] = useState(local.slice(0, 2));
  const [phone, setPhone] = useState(local.slice(2));
  const complete = /^[1-9][0-9]$/.test(ddd) && /^\d{8,9}$/.test(phone);
  const whatsapp = ddd || phone ? `55${ddd}${phone}` : "";
  const displayPhone =
    phone.length > 4 ? `${phone.slice(0, -4)}-${phone.slice(-4)}` : phone;
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setNotice(null);
        start(async () => {
          try {
            const result = await saveSettings({
              instagram: fd.get("instagram"),
              facebook: fd.get("facebook"),
              whatsapp,
            });
            setNotice(result);
            if (result.ok) router.refresh();
          } catch {
            setNotice({
              ok: false,
              message: "Não foi possível salvar. Confira sua conexão e sessão.",
            });
          }
        });
      }}
    >
      <section className="editor-section">
        <div className="editor-section-title">
          <span>01</span>
          <div>
            <h2>Canais de contato</h2>
            <p>
              Atualize suas redes sociais e o destino das conversas pelo
              WhatsApp.
            </p>
          </div>
        </div>
        <fieldset
          disabled={pending}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <div className="form-grid">
            <label className="field">
              Instagram
              <input
                name="instagram"
                defaultValue={settings.instagram}
                maxLength={300}
                placeholder="@sualoja"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="instagram-help"
              />
              <small id="instagram-help">
                Informe o @ ou o link do perfil.
              </small>
            </label>
            <label className="field">
              Página do Facebook
              <input
                name="facebook"
                defaultValue={settings.facebook}
                maxLength={300}
                placeholder="@suapagina"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="facebook-help"
              />
              <small id="facebook-help">Informe o @ ou o link da página.</small>
            </label>
            <fieldset className="whatsapp-settings full-width">
              <legend>WhatsApp que recebe as mensagens</legend>
              <p>
                Preencha o DDD da sua cidade e o número que usa no WhatsApp.
              </p>
              <div className="whatsapp-number-fields">
                <div className="field">
                  <span>País</span>
                  <div className="phone-country">Brasil (+55)</div>
                  <small>Já incluído automaticamente.</small>
                </div>
                <label className="field">
                  DDD
                  <input
                    name="ddd"
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel-area-code"
                    value={ddd}
                    onChange={(e) => {
                      setDdd(e.target.value.replace(/\D/g, "").slice(0, 2));
                      setNotice(null);
                    }}
                    maxLength={2}
                    pattern="[1-9][0-9]"
                    required={Boolean(phone)}
                    placeholder="11"
                    aria-describedby="ddd-help"
                  />
                  <small id="ddd-help">
                    2 dígitos. Exemplo: 11 (São Paulo).
                  </small>
                </label>
                <label className="field">
                  Número do WhatsApp
                  <input
                    name="phone_number"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-local"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 9));
                      setNotice(null);
                    }}
                    maxLength={10}
                    pattern="[0-9]{8,9}"
                    required={Boolean(ddd)}
                    placeholder="994830760"
                    aria-describedby="phone-help"
                  />
                  <small id="phone-help">
                    8 ou 9 dígitos, sem DDD e sem +55. Exemplo: 994830760.
                  </small>
                </label>
              </div>
              <div className="phone-preview" aria-live="polite">
                {complete ? (
                  <>
                    <span>As mensagens serão encaminhadas para</span>
                    <strong>
                      +55 ({ddd}) {displayPhone}
                    </strong>
                    <span>Clique em “Salvar contatos” para confirmar.</span>
                  </>
                ) : (
                  <span>
                    {ddd || phone
                      ? "Complete o DDD e o número para conferir o destino."
                      : "Nenhum WhatsApp cadastrado."}
                  </span>
                )}
              </div>
            </fieldset>
          </div>
          <p className="staff-help">
            Deixe uma rede social vazia para ocultar seu botão. Sem WhatsApp
            cadastrado, o site informa que esse atendimento está indisponível.
          </p>
        </fieldset>
      </section>
      {notice && <FormNotice {...notice} />}
      <div className="settings-save" style={{ position: "static" }}>
        <button className="button button-green" disabled={pending}>
          <Save size={18} />
          {pending ? "Salvando…" : "Salvar contatos"}
        </button>
      </div>
    </form>
  );
}
