import { Instagram, Facebook } from "lucide-react";
import { socialUrl } from "@/lib/contact-settings";
export function SocialLinks({
  instagram,
  facebook,
}: {
  instagram: string;
  facebook: string;
}) {
  const links = [
    {
      name: "Instagram",
      url: socialUrl(instagram, "instagram"),
      Icon: Instagram,
    },
    { name: "Facebook", url: socialUrl(facebook, "facebook"), Icon: Facebook },
  ].filter((link) => link.url);
  if (!links.length) return null;
  return (
    <div className="social-links">
      {links.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} da loja`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            paddingRight: 16,
          }}
        >
          <Icon size={20} aria-hidden="true" />
          {name}
        </a>
      ))}
    </div>
  );
}
