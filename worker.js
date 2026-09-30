export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Используй POST-запрос." }, 405);
      }

      try {
        const body = await request.json();

        let userMessage =
          body.message ??
          body.prompt ??
          body.text ??
          null;

        if (!userMessage && Array.isArray(body.messages)) {
          const lastMessage = body.messages
            .filter(m => m && m.role !== "system")
            .at(-1);

          userMessage = lastMessage?.content ?? null;
        }

        if (typeof userMessage !== "string" || !userMessage.trim()) {
          return json({
            error: "Сообщение не найдено."
          }, 400);
        }

        if (!env.AI) {
          return json({
            error: "Workers AI не подключён.",
            hint: "Проверь Binding с именем AI."
          }, 500);
        }

        const result = await env.AI.run(
          "@cf/zai-org/glm-4.7-flash",
          {
            messages: [
              {
                role: "system",
                content:
                  "Ты NOA — дружелюбный персональный AI-ассистент. " +
                  "Отвечай понятно, полезно и на языке пользователя."
              },
              {
                role: "user",
                content: userMessage.trim()
              }
            ],
            max_tokens: 512
          }
        );

        console.log("NOA AI result:", JSON.stringify(result));

        const reply =
          (typeof result === "string" ? result : null) ||
          result?.response ||
          result?.result?.response ||
          result?.choices?.[0]?.message?.content ||
          result?.output_text ||
          null;

        if (!reply || typeof reply !== "string") {
          return json({
            error: "Модель вернула пустой или неожиданный ответ.",
            result: result
          }, 502);
        }

        return json({
          reply: reply.trim()
        });

      } catch (error) {
        console.error("NOA AI error:", error);

        return json({
          error: "Ошибка Workers AI.",
          details: String(error?.message || error)
        }, 500);
      }
    }

    if (!env.ASSETS) {
      return new Response(
        "NOA: ASSETS binding not found",
        { status: 500 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
