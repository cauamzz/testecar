"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import WhatsAppDialog from "./whatsapp-dialog";
const WhatsAppContext = createContext<
  (destination: string, trigger: HTMLButtonElement) => void
>(() => {});
export function WhatsAppButton({
  href,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { href: string }) {
  const open = useContext(WhatsAppContext);
  return (
    <button
      {...props}
      type="button"
      onClick={(event) => {
        open(href, event.currentTarget);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
export function WhatsAppProvider({
  children,
  storeName,
}: {
  children: ReactNode;
  storeName: string;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <WhatsAppContext.Provider
      value={(href, element) => {
        trigger.current = element;
        setDestination(href);
      }}
    >
      {children}
      {destination !== null && (
        <WhatsAppDialog
          destination={destination}
          storeName={storeName}
          onClose={() => {
            setDestination(null);
            if (trigger.current?.isConnected) trigger.current.focus();
            else
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
          }}
        />
      )}
    </WhatsAppContext.Provider>
  );
}
