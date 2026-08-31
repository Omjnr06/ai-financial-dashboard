import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { twoFactor } from "better-auth/plugins";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// single Resend client for all outbound email (verification + password reset)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const resendFromEmail =
  process.env.RESEND_FROM_EMAIL || "noreply@mail.magbadelojr.com";

export const auth = betterAuth({
    trustedOrigins: [
    "http://localhost:3000",
    "https://ai-financial-dashboard.vercel.app",
    // to add custom domain after when bought
  ],
  // manages auth tables in the db
  database: pool,

  // could put session and expiryAt here but better auth defaults r good for now
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,

    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        throw new Error("RESEND_API_KEY is not configured.");
      }
      const response = await resend.emails.send({
        from: resendFromEmail,
        to: user.email,
        subject: "Reset your password — The Vault",
        html: `<p>We received a request to reset your password.</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
      if (response.error) {
        throw new Error(`Resend email failed: ${response.error.message}`);
      }
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        throw new Error("RESEND_API_KEY is not configured.");
      }
      const response = await resend.emails.send({
        from: resendFromEmail,
        to: user.email,
        subject: "Verify your email — The Vault",
        html: `<p>Click below to verify your email:</p><p><a href="${url}">${url}</a></p>`,
      });
      if (response.error) {
        throw new Error(`Resend email failed: ${response.error.message}`);
      }
    },
    sendOnSignUp: true,
  },

  user: { modelName: "ba_user" },
  session: {
  modelName: "ba_session",
  expiresIn: 60 * 60 * 24 * 7, // week expiration
  updateAge: 60 * 60 * 24, // day update
  freshAge: 0, // explicit freshness not required, building custom auth gate
},
  account: { modelName: "ba_account" },
  verification: { modelName: "ba_verification" },

  databaseHooks: {
    user: {
      create: {
        // creates the matching app profile right after a ba_user is made
        after: async (user) => {
          await pool.query(
            'INSERT INTO profiles (id, "userId", timezone, "themeId", "layoutId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
            [randomUUID(), user.id, "America/Toronto", "midnight", "horizontal", new Date()]
          );
        },
      },
    },
  },

  plugins: [
    twoFactor(),
  ],
});