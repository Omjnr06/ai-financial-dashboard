import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// this file creates the endpoints and hands incoming requests to Better Auth
export const { GET, POST } = toNextJsHandler(auth);