import { Suspense } from "react";
import { cadastroAberto } from "@/lib/cadastro";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm cadastroAberto={cadastroAberto()} />
    </Suspense>
  );
}
