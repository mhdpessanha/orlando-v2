import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  BookIcon,
  HouseIcon,
  MapIcon,
  SparkleIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import SyncButton from "@/components/SyncButton";
import { logoutAction } from "./actions";

const AVATAR_GRADIENTS: Record<string, string> = {
  pessanha: "linear-gradient(135deg, #f6c453, #d98a2b)",
  gabi: "linear-gradient(135deg, #ff8a7a, #d95f55)",
  vitor: "linear-gradient(135deg, #5fd0c5, #2f9a90)",
  mariana: "linear-gradient(135deg, #5fd0c5, #2f9a90)",
};

const NAV_ITEMS = [
  { label: "Início", href: "/", icon: HouseIcon, active: true },
  { label: "Roteiro", href: null, icon: MapIcon, active: false },
  { label: "Turma", href: null, icon: UsersIcon, active: false },
  { label: "Bolão", href: null, icon: TrophyIcon, active: false },
  { label: "Guia", href: null, icon: BookIcon, active: false },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[18px] pt-6">
      <header className="flex items-center justify-between px-[22px]">
        <div className="flex items-center gap-2">
          <SparkleIcon width={20} height={20} className="text-gold" />
          <span className="font-display text-[17px] font-semibold tracking-[0.5px]">
            Orlando 2027
          </span>
        </div>
        <div
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-extrabold text-[#2a1c05]"
          style={{ background: AVATAR_GRADIENTS[user.nucleo] ?? AVATAR_GRADIENTS.pessanha }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      </header>

      <main className="flex-grow px-[22px]">{children}</main>

      <nav className="sticky bottom-4 mx-4 mt-8 flex items-center justify-between rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(20,22,58,0.88)] px-5 py-[11px] backdrop-blur">
        {NAV_ITEMS.map(({ label, href, icon: Icon, active }) =>
          href ? (
            <a
              key={label}
              href={href}
              className={`flex min-w-[46px] flex-col items-center gap-[3px] ${
                active ? "text-gold-light" : "text-ink-faint"
              }`}
            >
              <Icon width={22} height={22} />
              <span className="text-[10px] font-extrabold">{label}</span>
            </a>
          ) : (
            <span
              key={label}
              title="em breve"
              className="flex min-w-[46px] cursor-default flex-col items-center gap-[3px] text-ink-faint opacity-40"
            >
              <Icon width={22} height={22} />
              <span className="text-[10px] font-extrabold">{label}</span>
            </span>
          ),
        )}
      </nav>

      <footer className="mt-5 flex items-center justify-center gap-3 px-[22px] text-[11px] font-bold text-ink-faint">
        <span>
          {user.name} · núcleo {user.nucleo}
        </span>
        <span aria-hidden>·</span>
        <form action={logoutAction}>
          <button type="submit" className="underline underline-offset-2 hover:text-ink-muted">
            sair
          </button>
        </form>
        {user.papel === "admin" && (
          <>
            <span aria-hidden>·</span>
            <SyncButton />
          </>
        )}
      </footer>
    </div>
  );
}
