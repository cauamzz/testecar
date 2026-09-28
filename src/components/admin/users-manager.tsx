"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { manageStaff } from "@/app/gestao-nv-8f4c2a/staff-actions";
import {
  normalizePermissions,
  permissionLabels,
  type Membership,
  type Permission,
} from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { FormNotice } from "@/components/ui";

const profiles: Record<string, Permission[]> = {
  "Sem acesso às áreas": [],
  "Somente consulta": ["stock.read", "leads.read"],
  Atendimento: ["stock.read", "leads.read", "leads.write"],
  "Gestão de estoque": ["stock.read", "stock.write"],
  "Gestão completa": Object.keys(permissionLabels) as Permission[],
};

function AccessFields({
  value,
  onChange,
}: {
  value: Permission[];
  onChange: (p: Permission[]) => void;
}) {
  return (
    <>
      <label className="field">
        Aplicar perfil de acesso
        <select value="" onChange={(e) => onChange(profiles[e.target.value])}>
          <option value="" disabled>
            Escolha um perfil ou personalize abaixo
          </option>
          {Object.keys(profiles).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <fieldset className="permission-options">
        <legend>Permissões individuais</legend>
        {(Object.entries(permissionLabels) as [Permission, string][]).map(
          ([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value.includes(key)}
                onChange={(e) => {
                  if (e.target.checked)
                    onChange(normalizePermissions([...value, key]));
                  else
                    onChange(
                      value.filter(
                        (p) =>
                          p !== key &&
                          !(
                            key === "stock.read" &&
                            ["stock.write", "stock.delete"].includes(p)
                          ) &&
                          !(key === "stock.write" && p === "stock.delete") &&
                          !(
                            key === "leads.read" &&
                            ["leads.write", "leads.delete"].includes(p)
                          ),
                      ),
                    );
                }}
              />
              {label}
            </label>
          ),
        )}
      </fieldset>
      <p className="staff-help">
        Editar inclui consultar. Excluir veículos inclui editar. Nenhum desses
        perfis permite gerenciar usuários.
      </p>
    </>
  );
}

function StaffForm({ member }: { member?: Membership }) {
  const [permissions, setPermissions] = useState<Permission[]>(
    member?.permissions || [],
  );
  const [active, setActive] = useState(member?.active ?? true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const router = useRouter();
  async function run(input: unknown, form: HTMLFormElement, reset: boolean) {
    setPending(true);
    setNotice(null);
    try {
      const result = await manageStaff(input);
      setNotice(result);
      if (result.ok) {
        if (reset) form.reset();
        if (!member) {
          setPermissions([]);
          setActive(true);
        }
        router.refresh();
      }
    } catch {
      setNotice({
        ok: false,
        message:
          "Não foi possível concluir. Verifique sua sessão e tente novamente.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="staff-form">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          void run(
            member
              ? {
                  operation: "access",
                  user_id: member.user_id,
                  permissions,
                  active,
                }
              : {
                  operation: "create",
                  username: fd.get("username"),
                  password: fd.get("password"),
                  permissions,
                  active,
                },
            form,
            !member,
          );
        }}
      >
        <fieldset disabled={pending} className="staff-fields">
          {!member && (
            <>
              <label className="field">
                Nome de usuário
                <input
                  name="username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}"
                  required
                  aria-describedby="username-help"
                />
              </label>
              <p id="username-help" className="staff-help">
                De 3 a 32 caracteres, sem espaços ou acentos. Letras, números,
                ponto, hífen e sublinhado.
              </p>
              <label className="field">
                Senha inicial
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <p className="staff-help">
                Use pelo menos 12 caracteres. O usuário poderá alterar a senha
                em Minha conta.
              </p>
            </>
          )}
          <AccessFields value={permissions} onChange={setPermissions} />
          <label className="staff-active">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Acesso ativo ao painel
          </label>
          {!active && (
            <p className="staff-help">
              Com o acesso desativado, esta conta não pode entrar nem executar
              operações administrativas.
            </p>
          )}
          <button className="button button-green" disabled={pending}>
            {pending ? "Salvando…" : member ? "Salvar acesso" : "Criar usuário"}
          </button>
        </fieldset>
      </form>
      {member && (
        <form
          className="staff-password"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (
              !window.confirm(
                `Redefinir a senha de ${member.username}? A senha anterior deixará de funcionar para novos logins.`,
              )
            )
              return;
            void run(
              {
                operation: "password",
                user_id: member.user_id,
                password: new FormData(form).get("password"),
              },
              form,
              true,
            );
          }}
        >
          <label className="field">
            Nova senha
            <input
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              disabled={pending}
            />
          </label>
          <button className="button button-outline" disabled={pending}>
            Redefinir senha
          </button>
          <p className="staff-help">
            A senha atual nunca é exibida. Para bloquear sessões abertas,
            desative o acesso acima.
          </p>
        </form>
      )}
      {notice && <FormNotice {...notice} />}
    </div>
  );
}

export function UsersManager({ members }: { members: Membership[] }) {
  return (
    <div className="staff-layout">
      <section className="admin-panel">
        <h2>Criar usuário</h2>
        <p className="staff-help">
          Comece com o mínimo de acesso necessário e ajuste quando precisar.
        </p>
        <StaffForm />
      </section>
      <section className="staff-directory" aria-label="Usuários cadastrados">
        <h2>Equipe ({members.length})</h2>
        {members.map((member) => (
          <article key={member.user_id} className="admin-panel staff-member">
            <h3>{member.username || "Administrador principal"}</h3>
            <p className="staff-help">
              {member.is_owner
                ? "Administrador principal · acesso completo"
                : member.active
                  ? "Acesso ativo"
                  : "Acesso desativado"}
            </p>
            {member.is_owner ? (
              <p>
                Conta protegida. A senha pode ser alterada pelo próprio
                administrador em Minha conta.
              </p>
            ) : (
              <details>
                <summary>Editar permissões e senha</summary>
                <StaffForm member={member} />
              </details>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
