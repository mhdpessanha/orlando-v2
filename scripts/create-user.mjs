#!/usr/bin/env node
// Define (ou redefine) a senha de um dos 6 logins da família.
// Uso: npm run create-user -- <usuario> [senha]
// Sem a senha no argumento, pede no terminal (digitação oculta).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline";

const KNOWN = {
  murilo: { name: "Murilo", nucleo: "pessanha", papel: "admin" },
  joana: { name: "Joana", nucleo: "pessanha", papel: "membro" },
  gabi: { name: "Gabi", nucleo: "gabi", papel: "membro" },
  gustavo: { name: "Gustavo", nucleo: "gabi", papel: "membro" },
  vitor: { name: "Vitor", nucleo: "vitor", papel: "membro" },
  mariana: { name: "Mariana", nucleo: "mariana", papel: "membro" },
};

function askHidden(query) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
    rl._writeToOutput = (s) => {
      if (s.includes(query)) rl.output.write(query);
    };
  });
}

const username = (process.argv[2] ?? "").toLowerCase();
let password = process.argv[3];

if (!KNOWN[username]) {
  console.error("Uso: npm run create-user -- <usuario> [senha]");
  console.error("Usuários válidos: " + Object.keys(KNOWN).join(", "));
  process.exit(1);
}

if (!password) {
  password = await askHidden(`Senha para "${username}": `);
}

if (!password || password.length < 6) {
  console.error("Senha muito curta (mínimo 6 caracteres).");
  process.exit(1);
}

const db = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);
const meta = KNOWN[username];

await db.user.upsert({
  where: { username },
  update: { passwordHash, ...meta },
  create: { username, passwordHash, ...meta },
});

console.log(`OK: usuário "${username}" (${meta.papel}, núcleo ${meta.nucleo}) pronto.`);
await db.$disconnect();
