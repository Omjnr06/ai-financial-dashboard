import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { Resend } from "resend";


const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const resendResetPasswordApiKey = process.env.RESEND_API_RESET_PASSWORD;
const resendResetPassword = resendResetPasswordApiKey
  ? new Resend(resendResetPasswordApiKey)
  : null;

const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";


export const auth = betterAuth({
// to manage auth tables in db
  database: pool,

// methods, here if we ever want touse google auth, or github auth
  emailAndPassword: {
  enabled: true,
  minPasswordLength: 8,
  
  sendResetPassword: async ({ user, url }) => {
    if (!resendResetPassword) {
      throw new Error("RESEND_API_RESET_PASSWORD is not configured.");
    }

    const response = await resendResetPassword.emails.send({
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


  user: { 
    modelName: "ba_user" 
    },
  session: { 
    modelName: "ba_session" 
    },
  account: {
     modelName: "ba_account" 
    },
  verification: { 
    modelName: "ba_verification" 
    },

  databaseHooks: {
    user: {
      create: {
        // creates the matching app profile right after a ba_user is made
        after: async (user) => {
          await pool.query(
            'INSERT INTO profiles (id, "userId", timezone, "themeId", "layoutId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
            [randomUUID(), user.id, "America/Toronto", "midnight","horizontal", new Date()]
          );
        },
        },
      },
    },

});