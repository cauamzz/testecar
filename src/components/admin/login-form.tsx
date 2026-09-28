"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { usernameToAuthEmail } from "@/lib/admin-username";
import { FormNotice } from "@/components/ui";
export function LoginForm({
  configured,
  reason,
}: {
  configured: boolean;
  reason?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const fd = new FormData(e.currentTarget);
    try {
      const client = browserClient();
      const email = usernameToAuthEmail(String(fd.get("username") || ""));
      if (!email) {
        setOk(false);
        setMessage(
          "Usuário ou senha inválidos. Confira os dados e tente novamente.",
        );
        return;
      }
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: String(fd.get("password")),
      });
      if (error || !data.user) {
        setOk(false);
        setMessage(
          "Usuário ou senha inválidos. Confira os dados e tente novamente.",
        );
        return;
      }
      const { data: membership, error: accessError } = await client
        .from("admin_users")
        .select("user_id,active")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (accessError || !membership?.active) {
        await client.auth.signOut();
        setOk(false);
        setMessage(
          "Usuário ou senha inválidos. Confira os dados e tente novamente.",
        );
        return;
      }
      router.replace("/gestao-nv-8f4c2a");
      router.refresh();
    } catch {
      setOk(false);
      setMessage("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-form">
      <span className="login-icon">
        <LockKeyhole size={25} />
      </span>
      <h1>Bem-vindo à sua loja.</h1>
      <p>Entre para gerenciar os veículos e acompanhar os contatos.</p>
      {!configured && (
        <FormNotice
          ok={false}
          message="A conexão com o Supabase ainda não foi configurada. Preencha as variáveis do arquivo .env.local e aplique as migrations conforme o README."
        />
      )}
      {reason === "session" && (
        <FormNotice
          ok={false}
          message="Entre com sua conta para continuar. Se sua sessão expirou, faça login novamente."
        />
      )}
      {reason === "access" && (
        <FormNotice
          ok={false}
          message="Sua conta não tem acesso administrativo. Solicite ao responsável pela loja a liberação do seu usuário."
        />
      )}
      <form onSubmit={submit}>
        <label className="field">
          Usuário
          <input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={32}
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        {message && <FormNotice ok={ok} message={message} />}
        <button
          className="button button-green"
          disabled={!configured || pending}
        >
          {pending ? "Aguarde…" : "Entrar no painel"}
          <ArrowUpRight size={18} />
        </button>
      </form>
      <Link href="/" className="login-back">
        ← Voltar ao site
      </Link>
    </div>
  );
}
