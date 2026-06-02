import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Ayuda en desarrollo si faltan las variables de entorno.
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env");
}

export const supabase = createClient(url, key);
