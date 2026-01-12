import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from backend .env
dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const usersToCreate = [
  {
    email: "selma@sefraseguros.com.br",
    password: "XXX", // Will be replaced in execution
    nome: "Selma",
    role: "admin",
  },
  {
    email: "financeiro@sefraseguros.com.br",
    password: "XXX",
    nome: "Financeiro",
    role: "admin",
  },
  {
    email: "vendas@sefraseguros.com.br",
    password: "XXX",
    nome: "Vendas",
    role: "admin",
  },
];

async function createUsers() {
  console.log("Starting user creation...");

  for (const user of usersToCreate) {
    try {
      // 1. Create Auth User
      // We use the raw admin API if the JS client helper doesn't expose strict admin methods easily for specific inputs
      // But supabase.auth.admin.createUser is standard.

      // First check if exists to avoid error? createUser returns error if exists.
      let userId = "";

      const passwordEnvKey = `PASSWORD_${user.email.split("@")[0].toUpperCase()}`;
      const password = process.env[passwordEnvKey];

      if (!password) {
        console.error(
          `Missing ${passwordEnvKey} env var for ${user.email}. Refusing to create/update user with hardcoded password.`
        );
        continue;
      }

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: password,
          email_confirm: true,
        });

      if (authError) {
        console.log(
          `Auth user creation failed or exists for ${user.email}: ${authError.message}`
        );
        // Try to get existing user ID if it failed because it exists
        if (authError.message.includes("already registered")) {
          // We could look it up but for now let's assume we proceed or skip
          // Actually we need the ID to update the public table.
          // Let's list users to find it.
          const { data: listData } = await supabase.auth.admin.listUsers();
          const existing = listData.users.find((u) => u.email === user.email);
          if (existing) userId = existing.id;
        }
      } else {
        userId = authData.user.id;
        console.log(`Auth user created: ${user.email}`);
      }

      if (userId) {
        // 2. Insert/Update into public.usuarios
        // Check if exists in public
        const { data: publicUser } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", userId)
          .single();

        if (!publicUser) {
          const { error: insertError } = await supabase
            .from("usuarios")
            .insert({
              id: userId,
              email: user.email,
              nome: user.nome,
              role: user.role,
              ativo: true,
            });

          if (insertError)
            console.error(
              `Error inserting public profile for ${user.email}:`,
              insertError
            );
          else console.log(`Public profile created for ${user.email}`);
        } else {
          // Ensure role matches requested
          if (publicUser.role !== user.role) {
            await supabase
              .from("usuarios")
              .update({ role: user.role })
              .eq("id", userId);
            console.log(`Updated role for ${user.email}`);
          }
          console.log(`Public profile already exists for ${user.email}`);
        }
      }
    } catch (err) {
      console.error(`Unexpected error processing ${user.email}:`, err);
    }
  }
}

createUsers();
