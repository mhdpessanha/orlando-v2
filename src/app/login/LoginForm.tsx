"use client";

import { useActionState } from "react";
import { SparkleIcon } from "@/components/icons";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-[22px] py-10">
      <div className="mb-9 flex flex-col items-center gap-3 text-center">
        <SparkleIcon width={34} height={34} className="text-gold" />
        <h1 className="font-display text-[28px] font-semibold tracking-[0.5px]">Orlando 2027</h1>
        <p className="text-[13px] font-semibold text-ink-muted">
          07 a 24 de janeiro · a contagem já começou
        </p>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-card-lg border border-stroke bg-surface p-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Usuário
          </span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className="rounded-xl border border-stroke bg-white/5 px-4 py-3 text-[15px] font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-gold/60"
            placeholder="seu nome"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Senha
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-xl border border-stroke bg-white/5 px-4 py-3 text-[15px] font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-gold/60"
            placeholder="••••••••"
          />
        </label>

        {state.error && (
          <p className="text-[13px] font-bold text-nucleo-gabi" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3.5 text-[15px] font-extrabold text-[#2a1c05] transition-opacity disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
