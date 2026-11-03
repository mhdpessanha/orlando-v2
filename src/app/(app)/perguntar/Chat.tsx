"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendIcon, SparkleIcon } from "@/components/icons";

type Mensagem = { role: "user" | "assistant"; content: string };

// A conversa vive só nesta aba do navegador (some ao fechar) — nada vai pro banco.
const CHAVE = "orlando-pergunte";
// O servidor recebe só as últimas mensagens: conversa longa não encarece cada pergunta
const HISTORICO_MAX = 20;

function salvar(lista: Mensagem[]) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {}
}

function Pensando() {
  return (
    <span className="flex gap-1 py-[7px]" aria-label="pensando">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-lavanda"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export default function Chat({ sugestoes }: { sugestoes: string[] }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(CHAVE);
      if (salvo) setMensagens(JSON.parse(salvo));
    } catch {}
  }, []);

  useEffect(() => {
    if (mensagens.length > 0) fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || pensando) return;
    const historico: Mensagem[] = [...mensagens, { role: "user", content: pergunta }];
    setMensagens([...historico, { role: "assistant", content: "" }]);
    setEntrada("");
    setErro(null);
    setPensando(true);

    let resposta = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.slice(-HISTORICO_MAX) }),
      });
      if (!res.ok || !res.body) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.erro ?? "não deu pra perguntar agora");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        resposta += decoder.decode(value, { stream: true });
        setMensagens([...historico, { role: "assistant", content: resposta }]);
      }
      const final: Mensagem[] = [...historico, { role: "assistant", content: resposta.trim() || "…" }];
      setMensagens(final);
      salvar(final);
    } catch (e) {
      // devolve a pergunta pro campo pra tentar de novo
      setMensagens(mensagens);
      setEntrada(pergunta);
      setErro(e instanceof Error ? e.message : "não deu pra perguntar agora");
    } finally {
      setPensando(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enviar(entrada);
  }

  function novaConversa() {
    setMensagens([]);
    setErro(null);
    salvar([]);
  }

  return (
    <div className="flex flex-col gap-4">
      {mensagens.length === 0 ? (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Experimenta perguntar
          </span>
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border border-stroke bg-surface px-3.5 py-2 text-left text-[12.5px] font-bold text-ink-soft transition-transform active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : (
        mensagens.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="max-w-[85%] self-end whitespace-pre-wrap rounded-[18px] rounded-br-[6px] border border-gold/40 bg-gold/[0.12] px-4 py-2.5 text-[14px] font-semibold leading-[1.45]"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex max-w-[94%] gap-2.5 self-start">
              <span className="mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[rgba(143,123,255,0.18)]">
                <SparkleIcon width={14} height={14} className="text-lavanda" />
              </span>
              <div className="min-w-0 whitespace-pre-wrap break-words rounded-[18px] rounded-tl-[6px] border border-stroke bg-surface px-4 py-2.5 text-[14px] leading-[1.5]">
                {m.content || <Pensando />}
              </div>
            </div>
          ),
        )
      )}

      {erro && (
        <p className="text-[12.5px] font-bold text-nucleo-gabi" role="alert">
          {erro}
        </p>
      )}
      <div ref={fimRef} className="scroll-mb-[180px]" />

      <form
        onSubmit={onSubmit}
        className="sticky bottom-[92px] z-10 flex gap-2 rounded-card-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(20,22,58,0.94)] p-2 backdrop-blur"
      >
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          maxLength={2000}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Pergunte qualquer coisa da viagem…"
          className="w-full min-w-0 bg-transparent px-2.5 text-[14px] font-semibold text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={pensando || !entrada.trim()}
          aria-label="Enviar"
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-deep text-[#2a1c05] transition-opacity active:scale-95 disabled:opacity-50"
        >
          <SendIcon width={20} height={20} strokeWidth={2.4} />
        </button>
      </form>

      <div className="flex items-center justify-between gap-3 text-[11px] text-ink-faint">
        <span>respostas de IA a partir dos dados do site — confira o que for crítico na tela certa</span>
        {mensagens.length > 0 && !pensando && (
          <button
            type="button"
            onClick={novaConversa}
            className="shrink-0 font-bold underline underline-offset-2 hover:text-ink-muted"
          >
            nova conversa
          </button>
        )}
      </div>
    </div>
  );
}
