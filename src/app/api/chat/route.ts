import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { contextoUsuario, contextoViagem, INSTRUCOES } from "@/lib/assistente";

// Haiku: rápido e barato (~US$ 0,01 quando grava o cache, ~US$ 0,001 lendo do cache)
const MODELO = "claude-haiku-5-5";

// Freio de custo por usuário (em memória: zera quando o container reinicia)
const LIMITE_POR_HORA = 40;
const perguntasRecentes = new Map<string, number[]>();

function estourouLimite(userId: string): boolean {
  const agora = Date.now();
  const recentes = (perguntasRecentes.get(userId) ?? []).filter((t) => agora - t < 3_600_000);
  if (recentes.length >= LIMITE_POR_HORA) return true;
  perguntasRecentes.set(userId, [...recentes, agora]);
  return false;
}

const Corpo = z.object({
  mensagens: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(40),
});

const ERRO_PADRAO = "Deu um problema pra falar com o assistente agora. Tenta de novo em instantes?";

function mensagemDeErro(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "A chave da API do assistente está inválida — avisa o Murilo.";
  if (e instanceof Anthropic.RateLimitError) return "Muita pergunta ao mesmo tempo. Espera uns segundos e tenta de novo.";
  return ERRO_PADRAO;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "faça login de novo" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "o assistente ainda não foi configurado" }, { status: 503 });
  }

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "mensagem inválida" }, { status: 400 });
  // a conversa precisa começar e terminar com quem pergunta
  const inicio = parsed.data.mensagens.findIndex((m) => m.role === "user");
  const mensagens = inicio >= 0 ? parsed.data.mensagens.slice(inicio) : [];
  if (mensagens.length === 0 || mensagens[mensagens.length - 1].role !== "user") {
    return NextResponse.json({ erro: "mensagem inválida" }, { status: 400 });
  }

  const { user } = session;
  if (estourouLimite(user.id)) {
    return NextResponse.json(
      { erro: `limite de ${LIMITE_POR_HORA} perguntas por hora — dá uma pausa e volta já já` },
      { status: 429 },
    );
  }

  const [viagem, usuario] = await Promise.all([contextoViagem(), contextoUsuario(user)]);

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODELO,
    max_tokens: 4096,
    output_config: { effort: "low" },
    // breakpoint no fim dos dados da viagem (cache compartilhado entre todo mundo)
    // + cache automático no fim da conversa (as perguntas seguintes reaproveitam)
    cache_control: { type: "ephemeral" },
    system: [
      { type: "text", text: INSTRUCOES },
      { type: "text", text: viagem, cache_control: { type: "ephemeral" } },
      { type: "text", text: usuario },
    ],
    messages: mensagens,
  });

  const encoder = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("Não consegui responder essa. Tenta perguntar de outro jeito?"));
        }
        const u = final.usage;
        console.log(
          `[chat] ${user.username}: entrada ${u.input_tokens} · cache lido ${u.cache_read_input_tokens ?? 0} · cache gravado ${
            u.cache_creation_input_tokens ?? 0
          } · saída ${u.output_tokens}`,
        );
      } catch (e) {
        console.error("[chat] erro", e);
        controller.enqueue(encoder.encode(`\n\n${mensagemDeErro(e)}`));
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(corpo, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
