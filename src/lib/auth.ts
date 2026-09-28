import "server-only";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase/server";
import { can, type Membership, type Permission } from "./permissions";
export async function requireAdmin(permission?: Permission | "users.manage") {
  const client = await serverClient();
  if (!client) redirect("/gestao-nv-8f4c2a/login?reason=setup");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/gestao-nv-8f4c2a/login?reason=session");
  const { data, error } = await client
    .from("admin_users")
    .select("user_id,username,active,is_owner,permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data || !data.active) redirect("/gestao-nv-8f4c2a/login?reason=access");
  const membership = data as Membership;
  if (permission && !can(membership, permission))
    redirect("/gestao-nv-8f4c2a?reason=permission");
  return { client, user, membership };
}
