import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    try {
      // 1. Ler o idToken do corpo
      const { idToken } = await req.json();
      if (!idToken || typeof idToken !== "string") {
        return Response.json({ error: "idToken ausente ou inválido" }, { status: 400 });
      }

      // 2. Validar o idToken com o Google
      const googleResp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );

      if (!googleResp.ok) {
        const errText = await googleResp.text();
        console.error("Google tokeninfo falhou:", googleResp.status, errText);
        return Response.json({ error: "Token inválido" }, { status: 401 });
      }

      const payload = await googleResp.json();

      // 3. Conferir o audience (aud) contra o webClientId
      const expectedAud = Deno.env.get("GOOGLE_WEB_CLIENT_ID");
      if (!expectedAud) {
        console.error("GOOGLE_WEB_CLIENT_ID não configurado nos secrets");
        return Response.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
      }
      if (payload.aud !== expectedAud) {
        console.error("Audience mismatch:", payload.aud, "!=", expectedAud);
        return Response.json({ error: "Token de audiência inválida" }, { status: 401 });
      }

      // 4. Extrair dados do usuário
      const email = payload.email;
      const nome = payload.name ?? payload.given_name ?? email?.split("@")[0] ?? "Usuário";
      const fotoUrl = payload.picture ?? null;
      const googleSub = payload.sub;

      if (!email || !googleSub) {
        return Response.json({ error: "Token sem email ou sub" }, { status: 401 });
      }

      // 5. Upsert em `usuarios` usando o admin client (bypassa RLS)
      const { data: user, error: upsertError } = await ctx.supabaseAdmin
        .from("usuarios")
        .upsert(
          {
            email,
            nome,
            foto_url: fotoUrl,
            google_sub: googleSub,
            senha_hash: null,
          },
          { onConflict: "google_sub" }
        )
        .select()
        .single();

      if (upsertError) {
        console.error("Erro no upsert:", upsertError);
        return Response.json({ error: "Erro ao salvar usuário", detalhe: upsertError.message }, { status: 500 });
      }

      // 6. Retornar o usuário para o app
      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          foto_url: user.foto_url,
        },
      });
    } catch (e) {
      console.error("Erro inesperado:", e);
      return Response.json({ error: "Erro interno", detalhe: String(e) }, { status: 500 });
    }
  }),
};