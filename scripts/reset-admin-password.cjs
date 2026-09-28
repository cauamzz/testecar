/* eslint-disable @typescript-eslint/no-require-imports -- Standalone operator script. */
// Run only on the operator's trusted computer. No credentials are written to disk.
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  if (!/^[a-z]{20}$/.test(ref)) throw new Error("Projeto vinculado inválido.");
  const keys = JSON.parse(execSync(
    `npx supabase projects api-keys --project-ref ${ref} --output json`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ));
  const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
  const anonKey = keys.find((key) => key.name === "anon")?.api_key;
  if (!serviceKey || !anonKey) throw new Error("Não foi possível obter as credenciais operacionais.");
  const url = `https://${ref}.supabase.co`;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, options);
  const { data: member, error } = await admin.from("admin_users")
    .select("user_id,active,is_owner").eq("username", "admin").single();
  if (error || !member?.active || !member.is_owner)
    throw new Error("Administrador principal ativo não encontrado. Nenhuma senha foi alterada.");
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(member.user_id);
  if (targetError || target.user?.email !== "admin@login.novadrive.invalid")
    throw new Error("Identidade do administrador não confere. Nenhuma senha foi alterada.");
  const password = `${randomBytes(18).toString("base64url")}A9!`;
  const { error: resetError } = await admin.auth.admin.updateUserById(member.user_id, { password });
  if (resetError) throw new Error("O Supabase não confirmou a redefinição. Tente novamente.");
  console.log("Usuário: admin");
  console.log(`Nova senha: ${password}`);
  const client = createClient(url, anonKey, options);
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email: target.user.email, password });
  if (loginError || login.user?.id !== member.user_id)
    throw new Error("Senha redefinida, mas a verificação do login falhou. Use a senha exibida acima.");
  await client.auth.signOut({ scope: "local" });
  console.log("Login verificado. Guarde a senha em um gerenciador de senhas.");
}
main().catch(() => {
  // Do not print raw CLI/SDK exceptions: they may contain privileged response data.
  console.error("Não foi possível concluir todas as etapas. Confira o login da CLI e o projeto vinculado. Se uma nova senha foi exibida, a redefinição já ocorreu.");
  process.exitCode = 1;
});
