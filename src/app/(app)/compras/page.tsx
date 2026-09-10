import { redirect } from "next/navigation";
import { BagIcon, CheckIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { avatarVariant } from "@/lib/avatars";
import { moeda } from "@/lib/format";
import { getCompras } from "@/lib/queries";
import ItemCompra from "./ItemCompra";
import { metaItem, type Item } from "./item";
import NovoItem from "./NovoItem";

export const metadata = { title: "Compras · Orlando 2027" };

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

// Item de outra pessoa: só leitura
function ItemDeOutro({ item }: { item: Item }) {
  const meta = metaItem(item);
  return (
    <div
      className={`flex items-center gap-3 rounded-card border border-stroke bg-surface px-4 py-3 ${
        item.comprado ? "opacity-60" : ""
      }`}
    >
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
          item.comprado ? "border-gold bg-gold text-night-deep" : "border-[rgba(255,255,255,0.18)] text-transparent"
        }`}
      >
        <CheckIcon width={12} height={12} strokeWidth={2.6} />
      </span>
      <div className="flex min-w-0 grow flex-col gap-[1px]">
        <span className={`truncate text-[14px] font-bold ${item.comprado ? "line-through" : ""}`}>
          {item.nome}
        </span>
        {(meta || item.notas) && (
          <span className="line-clamp-2 text-[12px] text-ink-muted">
            {[meta, item.notas].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-stroke bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-extrabold text-lavanda"
        >
          link
        </a>
      )}
    </div>
  );
}

export default async function ComprasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { minha, totalMinha, deOutros, pessoas } = await getCompras(session.userId);
  const totalFamilia = deOutros.reduce((acc, g) => acc + g.itens.length, 0);
  const comprados = minha.filter((i) => i.comprado).length;

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Lista de compras</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          o que cada um quer trazer de lá — e quanto custa aqui, pra comparar
        </span>
      </div>

      <NovoItem pessoas={pessoas} />

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Minha lista
          </span>
          {minha.length > 0 && (
            <span className="text-[11px] font-bold text-ink-faint">
              {plural(minha.length, "item", "itens")}
              {comprados > 0 ? ` · ${comprados} na mala` : ""}
              {totalMinha > 0 ? ` · ~${moeda(totalMinha, "BRL")} no Brasil` : ""}
            </span>
          )}
        </div>
        {minha.length === 0 ? (
          <div className="flex items-center gap-3 rounded-card border border-dashed border-stroke px-4 py-4 text-[12.5px] text-ink-muted">
            <BagIcon width={20} height={20} className="shrink-0 text-lavanda" />
            sua lista está vazia — escreve o primeiro desejo aí em cima
          </div>
        ) : (
          minha.map((item) => <ItemCompra key={item.id} item={item} pessoas={pessoas} />)
        )}
        {minha.length > 0 && (
          <span className="text-[11px] text-ink-faint">
            toca num item pra editar · o círculo marca o que já está na mala
          </span>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Da família
          </span>
          {totalFamilia > 0 && (
            <span className="text-[11px] font-bold text-ink-faint">
              {plural(totalFamilia, "desejo", "desejos")}
            </span>
          )}
        </div>
        {deOutros.length === 0 ? (
          <span className="text-[12.5px] text-ink-muted">
            ninguém publicou nada ainda — os itens visíveis pra família aparecem aqui
          </span>
        ) : (
          deOutros.map(({ user, itens, total }) => {
            const avatar = avatarVariant(user.nucleo, 0);
            return (
              <div key={user.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 pt-1">
                  <span
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-extrabold"
                    style={{ background: avatar.bg, color: avatar.text }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13.5px] font-extrabold">{user.name}</span>
                  <span className="grow text-right text-[11px] font-bold text-ink-faint">
                    {plural(itens.length, "item", "itens")}
                    {total > 0 ? ` · ~${moeda(total, "BRL")}` : ""}
                  </span>
                </div>
                {itens.map((item) => (
                  <ItemDeOutro key={item.id} item={item} />
                ))}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
