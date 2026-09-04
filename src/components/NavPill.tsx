"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, HouseIcon, MapIcon, TrophyIcon, UsersIcon } from "./icons";

const ITEMS = [
  { label: "Início", href: "/", icon: HouseIcon },
  { label: "Roteiro", href: "/roteiro", icon: MapIcon },
  { label: "Turma", href: "/turma", icon: UsersIcon },
  { label: "Bolão", href: null, icon: TrophyIcon },
  { label: "Guia", href: "/guia", icon: BookIcon },
] as const;

export default function NavPill() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-4 mx-4 mt-8 flex items-center justify-between rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(20,22,58,0.88)] px-5 py-[11px] backdrop-blur">
      {ITEMS.map(({ label, href, icon: Icon }) => {
        if (!href) {
          return (
            <span
              key={label}
              title="em breve"
              className="flex min-w-[46px] cursor-default flex-col items-center gap-[3px] text-ink-faint opacity-40"
            >
              <Icon width={22} height={22} />
              <span className="text-[10px] font-extrabold">{label}</span>
            </span>
          );
        }
        const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={`flex min-w-[46px] flex-col items-center gap-[3px] transition-colors duration-200 ${
              ativo ? "text-gold-light" : "text-ink-faint hover:text-ink-muted"
            }`}
          >
            <Icon width={22} height={22} />
            <span className="text-[10px] font-extrabold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
