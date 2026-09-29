import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { getAvatares, getDecisoesResumo } from "@/lib/queries";
import { SparkleIcon } from "@/components/icons";
import NavPill from "@/components/NavPill";
import SyncButton from "@/components/SyncButton";
import { logoutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;
  const [avatarDe, decisoes] = await Promise.all([getAvatares(), getDecisoesResumo(session.userId)]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[18px] pt-6">
      <header className="flex items-center justify-between px-[22px]">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <SparkleIcon width={20} height={20} className="text-gold" />
          <span className="font-display text-[17px] font-semibold tracking-[0.5px]">
            Orlando 2027
          </span>
        </Link>
        <Avatar a={avatarDe(user.name, user.nucleo)} size={34} />
      </header>

      <main className="flex-grow px-[22px]">{children}</main>

      <NavPill decisoes={decisoes} />

      <footer className="mt-5 flex items-center justify-center gap-3 px-[22px] text-[11px] font-bold text-ink-faint">
        <span>
          {user.name} · núcleo {user.nucleo}
        </span>
        <span aria-hidden>·</span>
        <Link href="/turma" className="underline underline-offset-2 hover:text-ink-muted">
          turma
        </Link>
        <span aria-hidden>·</span>
        <form action={logoutAction}>
          <button type="submit" className="underline underline-offset-2 hover:text-ink-muted">
            sair
          </button>
        </form>
        {user.papel === "admin" && (
          <>
            <span aria-hidden>·</span>
            <Link href="/pendencias" className="underline underline-offset-2 hover:text-ink-muted">
              pendências
            </Link>
            <span aria-hidden>·</span>
            <SyncButton />
          </>
        )}
      </footer>
    </div>
  );
}
