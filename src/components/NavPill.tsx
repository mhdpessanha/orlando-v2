"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BallotIcon, BookIcon, HouseIcon, MapIcon, UsersIcon } from "./icons";

const ITEMS = [
  { label: "Início", href: "/", icon: HouseIcon },
  { label: "Roteiro", href: "/roteiro", icon: MapIcon },
  { label: "Turma", href: "/turma", icon: UsersIcon },
  { label: "Decisões", href: "/decisoes", icon: BallotIcon },
  { label: "Guia", href: "/guia", icon: BookIcon },
] as const;

type Props = {
  // decisões em aberto (badge) e quantas ainda sem o voto de quem está logado
  decisoes?: { abertas: number; pendentes: number } | null;
};

export default function NavPill({ decisoes }: Props) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-4 mx-4 mt-8 flex items-center justify-between rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(20,22,58,0.88)] px-5 py-[11px] backdrop-blur">
      {ITEMS.map(({ label, href, icon: Icon }) => {
        const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const badge = href === "/decisoes" && decisoes && decisoes.abertas > 0 ? decisoes : null;
        return (
          <Link
            key={label}
            href={href}
            className={`flex min-w-[46px] flex-col items-center gap-[3px] transition-colors duration-200 ${
              ativo ? "text-gold-light" : "text-ink-faint hover:text-ink-muted"
            }`}
          >
            <span className="relative">
              <Icon width={22} height={22} />
              {badge && (
                <span
                  aria-label={`${badge.abertas} em aberto`}
                  className={`absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9.5px] font-extrabold leading-none ${
                    badge.pendentes > 0
                      ? "bg-gold text-night-deep shadow-[0_0_10px_rgba(246,196,83,0.6)]"
                      : "bg-[rgba(255,255,255,0.22)] text-ink"
                  }`}
                >
                  {badge.abertas}
                </span>
              )}
            </span>
            <span className="text-[10px] font-extrabold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
