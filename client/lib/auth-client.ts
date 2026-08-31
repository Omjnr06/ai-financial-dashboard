import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// how frontend accesses the sign in sign up forgot password methods
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

