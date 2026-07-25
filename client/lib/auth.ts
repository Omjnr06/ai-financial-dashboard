import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({

// to manage auth tables in db
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

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

});