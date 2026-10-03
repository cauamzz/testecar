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
import type { ContactChannels } from "@/lib/whatsapp-routing";
const ChannelsContext = createContext<ContactChannels>({
  whatsapp: "",
  whatsapp_financing: "",
  whatsapp_sales: "",
  whatsapp_purchase: "",
});
export const useContactChannels = () => useContext(ChannelsContext);
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
  channels,
}: {
  children: ReactNode;
  storeName: string;
  channels: ContactChannels;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <ChannelsContext.Provider value={channels}>
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
    </ChannelsContext.Provider>
  );
}
