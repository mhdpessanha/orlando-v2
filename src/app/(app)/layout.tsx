import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { avatarVariant } from "@/lib/avatars";
import { getDecisoesResumo } from "@/lib/queries";
import { SparkleIcon } from "@/components/icons";
import NavPill from "@/components/NavPill";
import SyncButton from "@/components/SyncButton";
import { logoutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;
  const avatar = avatarVariant(user.nucleo, 0);
  const decisoes = await getDecisoesResumo(session.userId);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[18px] pt-6">
      <header className="flex items-center justify-between px-[22px]">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <SparkleIcon width={20} height={20} className="text-gold" />
          <span className="font-display text-[17px] font-semibold tracking-[0.5px]">
            Orlando 2027
          </span>
        </Link>
        <div
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-extrabold"
          style={{ background: avatar.bg, color: avatar.text }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      </header>

      <main className="flex-grow px-[22px]">{children}</main>

      <NavPill decisoes={decisoes} />

      <footer className="mt-5 flex items-center justify-center gap-3 px-[22px] text-[11px] font-bold text-ink-faint">
        <span>
          {user.name} · núcleo {user.nucleo}
        </span>
        <span aria-hidden>·</span>
        <Link href="/financeiro" className="underline underline-offset-2 hover:text-ink-muted">
          financeiro
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
            <SyncButton />
          </>
        )}
      </footer>
    </div>
  );
}
