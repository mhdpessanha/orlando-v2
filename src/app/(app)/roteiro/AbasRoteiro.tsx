import Link from "next/link";

// Roteiro tem duas abas: os dias e as atrações (a nav já está cheia).
export default function AbasRoteiro({
  ativa,
  pendentes,
}: {
  ativa: "dias" | "atracoes";
  pendentes?: number; // atrações ainda sem a minha nota
}) {
  const abas = [
    { id: "dias", label: "Dias", href: "/roteiro" },
    { id: "atracoes", label: "Atrações", href: "/roteiro/atracoes" },
  ] as const;
  return (
    <div className="flex gap-1 rounded-full border border-stroke bg-white/[0.04] p-1">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-[13px] font-extrabold transition-colors ${
            ativa === a.id
              ? "border-gold/40 bg-gold/[0.14] text-gold-light"
              : "border-transparent text-ink-faint"
          }`}
        >
          {a.label}
          {a.id === "atracoes" && !!pendentes && (
            <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gold px-1 text-[9.5px] font-extrabold leading-none text-night-deep">
              {pendentes}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
