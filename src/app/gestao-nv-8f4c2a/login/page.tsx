import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/admin/login-form";
import { supabaseConfigured } from "@/lib/supabase/config";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main id="main-content" className="login-page">
      <div className="login-brand">
        <Logo light />
        <div>
          <span className="eyebrow">SUA LOJA, EM MOVIMENTO</span>
          <h2>
            Mais tempo para
            <br />
            bons negócios.
          </h2>
          <p>
            Seu estoque, seus contatos e as informações da loja em um só lugar.
          </p>
        </div>
        <span>NovaDrive Motors · Área exclusiva da equipe</span>
      </div>
      <div className="login-content">
        <LoginForm configured={supabaseConfigured()} reason={reason} />
      </div>
    </main>
  );
}
