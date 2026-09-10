import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CRIADOR" | "COMPRADOR";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "CRIADOR" | "COMPRADOR";
  }
}
