"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { stopAnalytics } from "@/lib/analytics";
import {
  CONSENT_KEY,
  DENIED,
  allowsConsent,
  makeConsent,
  parseConsent,
  type ConsentChoices,
} from "@/lib/consent";
const CHANGE = "novadrive:consent-change";
let sessionOverride: string | undefined;
function snapshot() {
  try {
    const raw = sessionOverride ?? localStorage.getItem(CONSENT_KEY);
    return parseConsent(raw) ? raw : null;
  } catch {
    return sessionOverride || null;
  }
}
export function hasAnalyticsConsent() {
  return allowsConsent(parseConsent(snapshot()), "analytics");
}
function subscribe(notify: () => void) {
  const checkedNotify = () => {
    if (!hasAnalyticsConsent()) stopAnalytics();
    notify();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY || event.key === null) {
      checkedNotify();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener(CHANGE, checkedNotify);
  const timer = window.setInterval(checkedNotify, 60_000);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(CHANGE, checkedNotify);
    window.clearInterval(timer);
  };
}
const Context = createContext({
  consent: null as ReturnType<typeof parseConsent>,
  open: () => {},
});
export const useCookieConsent = () => useContext(Context);
// Optional embeds/scripts must be inside this boundary, never in a server layout.
// Script integrations also need a cleanup that revokes their vendor consent on unmount.
export function ConsentGate({
  category,
  children,
  fallback = null,
}: {
  category: keyof ConsentChoices;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { consent } = useCookieConsent();
  return allowsConsent(consent, category) ? children : fallback;
}
export function CookiePreferencesButton() {
  const { open } = useCookieConsent();
  return (
    <button type="button" className="cookie-preferences-link" onClick={open}>
      Preferências de cookies
    </button>
  );
}
function clearOptionalCookies() {
  const hosts = location.hostname.split(".");
  const domains = [
    "",
    ...hosts
      .map((_, i) => "." + hosts.slice(i).join("."))
      .filter((x) => x.split(".").length > 2),
  ];
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0].trim();
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_fbp$|_fbc$)/.test(name))
      continue;
    for (const domain of domains)
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? "; Domain=" + domain : ""}`;
  }
}
export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const consent = useMemo(() => parseConsent(raw), [raw]);
  const previousConsent = useRef(consent);
  useEffect(() => {
    const previous = previousConsent.current;
    previousConsent.current = consent;
    // Also revoke when another tab changes the choice or the choice expires.
    if (
      previous &&
      (Object.keys(DENIED) as (keyof ConsentChoices)[]).some(
        (key) => previous[key] && !consent?.[key],
      )
    ) {
      clearOptionalCookies();
      if (sessionOverride === undefined) window.location.reload();
    }
  }, [consent]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(DENIED);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => {
    setDraft(consent || DENIED);
    setEditing(true);
  };
  useEffect(() => {
    if (editing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editing]);
  const save = (choices: ConsentChoices) => {
    const next = makeConsent(choices);
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
      sessionOverride = undefined;
      setError("");
    } catch {
      sessionOverride = JSON.stringify(makeConsent(DENIED));
      // Remove an earlier opt-in where possible (e.g. a full storage quota).
      // Never reload after a failed write: that could restore an old opt-in.
      try {
        localStorage.removeItem(CONSENT_KEY);
      } catch {
        /* Storage blocked. */
      }
      window.dispatchEvent(new Event(CHANGE));
      clearOptionalCookies();
      setError(
        "Seu navegador não permitiu salvar a escolha. Os recursos opcionais continuam desativados nesta visita.",
      );
      return;
    }
    window.dispatchEvent(new Event(CHANGE));
    setEditing(false);
  };
  return (
    <Context.Provider value={{ consent, open }}>
      {children}
      {!consent && (
        <section className="cookie-banner" aria-labelledby="cookie-title">
          <div>
            <h2 id="cookie-title">Sua privacidade importa</h2>
            <p>
              Usamos armazenamento necessário para lembrar suas escolhas. Você
              decide sobre estatísticas, publicidade e mapas externos. É
              possível navegar sem aceitar os opcionais.{" "}
              <Link href="/privacidade#cookies" prefetch={false}>
                Saiba mais
              </Link>
              .
            </p>
          </div>
          <div className="cookie-actions">
            <button type="button" onClick={() => save(DENIED)}>
              Recusar opcionais
            </button>
            <button type="button" onClick={open}>
              Personalizar
            </button>
            <button
              type="button"
              onClick={() =>
                save({ analytics: true, marketing: true, external: true })
              }
            >
              Aceitar todos
            </button>
          </div>
        </section>
      )}
      {error && !editing && (
        <p className="cookie-error" role="alert">
          {error}
        </p>
      )}
      <dialog
        className="cookie-dialog"
        ref={dialog}
        aria-labelledby="cookie-dialog-title"
        onCancel={() => setEditing(false)}
        onClose={() => setEditing(false)}
      >
        <div className="cookie-dialog-content">
          {error && <p role="alert">{error}</p>}
          <h2 id="cookie-dialog-title">Preferências de cookies</h2>
          <p>
            Escolha o que pode ser ativado. Recusar não impede o uso do site ou
            o contato com a loja.
          </p>
          <div className="cookie-category">
            <strong>Necessários · sempre ativos</strong>
            <p>
              Guardam esta escolha por até 180 dias. No painel, mantêm a sessão
              de acesso. Não são usados para publicidade.
            </p>
          </div>
          {(
            [
              [
                "analytics",
                "Estatísticas",
                "Quando configurado pela loja, o Google Analytics mede as páginas visitadas após sua autorização. Não enviamos os dados dos formulários ao Analytics.",
              ],
              [
                "marketing",
                "Publicidade",
                "Permitem medir campanhas, como um Pixel da Meta. Nenhum Pixel está instalado atualmente.",
              ],
              [
                "external",
                "Mapas externos",
                "Permitem carregar o Google Maps dentro do site. O Google recebe informações da conexão e pode usar cookies próprios.",
              ],
            ] as const
          ).map(([key, label, description]) => (
            <label className="cookie-category cookie-choice" key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: e.target.checked })
                }
              />
              <span>
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
            </label>
          ))}
          <p>
            Se adicionarmos uma ferramenta de estatísticas ou publicidade,
            pediremos uma nova escolha. Você pode rever estas preferências no
            rodapé.{" "}
            <Link
              href="/privacidade#cookies"
              prefetch={false}
              onClick={() => setEditing(false)}
            >
              Política de cookies
            </Link>
            .
          </p>
          <div className="cookie-actions">
            <button type="button" onClick={() => save(DENIED)}>
              Recusar opcionais
            </button>
            <button type="button" onClick={() => save(draft)}>
              Salvar preferências
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Fechar sem alterar
            </button>
          </div>
        </div>
      </dialog>
    </Context.Provider>
  );
}
