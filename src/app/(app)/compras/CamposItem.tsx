"use client";

// Campos do formulário de item (usados no "novo" e no "editar" da folha).

export const INPUT =
  "w-full rounded-xl border border-stroke bg-white/5 px-3.5 py-2.5 text-[14px] font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-gold/60";

export type Pessoa = { id: string; nome: string };

export type ItemDefaults = {
  nome?: string;
  onde?: string | null;
  paraPersonId?: string | null;
  precoBrasil?: number | null;
  link?: string | null;
  notas?: string | null;
  publico?: boolean;
};

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
      {children}
    </span>
  );
}

export default function CamposItem({
  pessoas,
  defaults = {},
  semNome,
}: {
  pessoas: Pessoa[];
  defaults?: ItemDefaults;
  semNome?: boolean; // o "novo" mostra o nome fora daqui
}) {
  const preco =
    defaults.precoBrasil != null
      ? defaults.precoBrasil.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";
  return (
    <div className="flex flex-col gap-3">
      {!semNome && (
        <label className="flex flex-col gap-1.5">
          <Rotulo>O que</Rotulo>
          <input name="nome" required maxLength={120} defaultValue={defaults.nome ?? ""} className={INPUT} />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <Rotulo>Onde</Rotulo>
          <input
            name="onde"
            maxLength={80}
            defaultValue={defaults.onde ?? ""}
            placeholder="outlet, Target…"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <Rotulo>Preço no Brasil</Rotulo>
          <input
            name="precoBrasil"
            inputMode="decimal"
            defaultValue={preco}
            placeholder="R$ pra comparar"
            className={INPUT}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <Rotulo>Pra quem</Rotulo>
        <select
          name="paraPersonId"
          defaultValue={defaults.paraPersonId ?? ""}
          className={`${INPUT} appearance-none [color-scheme:dark]`}
        >
          <option value="">pra mim</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <Rotulo>Link</Rotulo>
        <input
          name="link"
          inputMode="url"
          autoCapitalize="none"
          maxLength={500}
          defaultValue={defaults.link ?? ""}
          placeholder="amazon.com/…"
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <Rotulo>Notas</Rotulo>
        <textarea
          name="notas"
          rows={2}
          maxLength={500}
          defaultValue={defaults.notas ?? ""}
          placeholder="tamanho, cor, modelo…"
          className={`${INPUT} resize-none`}
        />
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-stroke bg-white/[0.04] px-3.5 py-3">
        <input
          type="checkbox"
          name="publico"
          defaultChecked={defaults.publico ?? true}
          className="h-[18px] w-[18px] shrink-0 accent-[#f6c453]"
        />
        <span className="flex flex-col">
          <span className="text-[13px] font-bold">Visível pra família</span>
          <span className="text-[11px] text-ink-muted">desmarca pra deixar só com você (nem o Murilo vê)</span>
        </span>
      </label>
    </div>
  );
}
