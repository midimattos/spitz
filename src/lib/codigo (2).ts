import { randomBytes } from "crypto";

// Sem 0/O/1/I para o código ser fácil de ler e digitar.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function codigoCurto(tamanho = 8): string {
  const bytes = randomBytes(tamanho);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

export function tokenLongo(): string {
  return randomBytes(18).toString("base64url");
}
