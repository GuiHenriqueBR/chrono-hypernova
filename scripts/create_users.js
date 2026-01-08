const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from backend .env
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.log("Path checked:", path.join(__dirname, "../backend/.env"));
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
      let userId = "";
      let password = "";
      if (user.email.includes("selma")) password = "21031972";
      if (user.email.includes("financeiro")) password = "13121972";
      if (user.email.includes("vendas")) password = "23042002";

      console.log(`Creating/Checking auth for: ${user.email}`);

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: password,
          email_confirm: true,
        });

      if (authError) {
        console.log(`Auth result: ${authError.message}`);
        if (
          authError.message.includes("already registered") ||
          authError.status === 422
        ) {
          const { data: listData } = await supabase.auth.admin.listUsers();
          const existing = listData.users.find((u) => u.email === user.email);
          if (existing) {
            userId = existing.id;
            console.log(`Found existing ID: ${userId}`);
          }
        }
      } else {
        userId = authData.user.id;
        console.log(`Auth user created: ${user.email} (ID: ${userId})`);
      }

      if (userId) {
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
            console.error(`Error inserting public profile:`, insertError);
          else console.log(`Public profile created for ${user.email}`);
        } else {
          if (publicUser.role !== user.role) {
            await supabase
              .from("usuarios")
              .update({ role: user.role })
              .eq("id", userId);
            console.log(`Updated role for ${user.email}`);
          } else {
            console.log(`Public profile OK for ${user.email}`);
          }
        }
      }
    } catch (err) {
      console.error(`Unexpected error processing ${user.email}:`, err);
    }
  }
}

createUsers();
