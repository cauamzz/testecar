"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/types";
import { FormNotice } from "@/components/ui";
export function AccountForm() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  return (
    <form
      className="editor-section account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const password = String(fd.get("password"));
        if (password !== fd.get("confirmation")) {
          setNotice({ ok: false, message: "As senhas precisam ser iguais." });
          return;
        }
        setPending(true);
        try {
          const { error } = await browserClient().auth.updateUser({ password });
          setNotice({
            ok: !error,
            message: error
              ? "Não foi possível alterar a senha. Use uma senha forte, diferente da anterior, ou entre novamente no painel."
              : "Senha alterada com sucesso.",
          });
          if (!error) form.reset();
        } catch {
          setNotice({
            ok: false,
            message: "Falha de conexão. Tente novamente.",
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Alterar senha</h2>
      <p>Use pelo menos 12 caracteres, incluindo letras, números e símbolos.</p>
      <label className="field">
        Nova senha
        <input
          type="password"
          name="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      <label className="field">
        Confirme a nova senha
        <input
          type="password"
          name="confirmation"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      {notice && <FormNotice {...notice} />}
      <button className="button button-green" disabled={pending}>
        {pending ? "Salvando…" : "Alterar senha"}
      </button>
    </form>
  );
}
