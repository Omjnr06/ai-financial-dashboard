import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 

export const auth = betterAuth({

// to manage auth tables in db
  database: pool,

// methods, here if we ever want touse google auth, or github auth
  emailAndPassword:{
    enabled: true,
    minPasswordLength: 8,
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
            'INSERT INTO profiles (id, "userId", timezone, "themeId", "createdAt") VALUES ($1, $2, $3, $4, $5)',
            [randomUUID(), user.id, "America/Toronto", "midnight","horizontal", new Date()]
          );
        },
        },
      },
    },

});