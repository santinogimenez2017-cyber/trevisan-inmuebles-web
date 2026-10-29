const SRC = {
  whatsapp: '/assets/icons/whatsapp.png',
  instagram: '/assets/icons/instagram.png',
  facebook: '/assets/icons/facebook.webp',
} as const;

export type SocialIconName = keyof typeof SRC;

/** Static brand icon served from public/assets/icons (copied as-is into dist/ by Vite). */
export function SocialIcon({ name, size = 16, className = '' }: { name: SocialIconName; size?: number; className?: string }) {
  return (
    <img
      src={SRC[name]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
