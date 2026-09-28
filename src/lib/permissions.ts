export const permissionLabels = {
  "stock.read": "Consultar estoque completo",
  "stock.write": "Cadastrar, editar e publicar veículos",
  "stock.delete": "Excluir veículos",
  "leads.read": "Consultar contatos recebidos",
  "leads.write": "Atualizar atendimento dos contatos",
  "leads.delete": "Excluir contatos permanentemente",
  "settings.write": "Editar redes sociais e WhatsApp",
} as const;
export type Permission = keyof typeof permissionLabels;
export type Membership = {
  user_id: string;
  username: string | null;
  active: boolean;
  is_owner: boolean;
  permissions: Permission[];
};
export function can(
  member: Membership,
  permission: Permission | "users.manage",
) {
  return (
    member.active &&
    (member.is_owner ||
      (permission !== "users.manage" &&
        member.permissions.includes(permission)))
  );
}
export function normalizePermissions(values: Permission[]): Permission[] {
  const set = new Set(values);
  if (set.has("stock.delete")) set.add("stock.write");
  if (set.has("stock.write")) set.add("stock.read");
  if (set.has("leads.write")) set.add("leads.read");
  if (set.has("leads.delete")) set.add("leads.read");
  return [...set];
}
