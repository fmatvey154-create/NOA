export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Главная страница
    if (request.method === "GET" && url.pathname === "/") {
      return env.ASSETS.fetch(request);
    }

    // API NOA
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const message = body?.message?.trim();

        if (!message) {
          return json({
            reply: "Напиши сообщение, и NOA ответит."
          });
        }

        const result = await env.AI.run(
          "@cf/zai-org/glm-4.7-flash",
          {
            messages: [
              {
                role: "system",
                content:
                  "Ты — NOA, дружелюбный и умный персональный AI-ассистент. Отвечай естественно, понятно и по существу. Не упоминай внутренние технические детали."
              },
              {
                role: "user",
                content: message
              }
            ]
          }
        );

        // Пытаемся получить текст из разных возможных форматов ответа
        let reply = null;

        if (typeof result === "string") {
          reply = result;
        }

        if (!reply && typeof result?.response === "string") {
          reply = result.response;
        }

        if (!reply && typeof result?.result?.response === "string") {
          reply = result.result.response;
        }

        if (!reply && typeof result?.output_text === "string") {
          reply = result.output_text;
        }

        if (!reply && Array.isArray(result?.choices)) {
          const choice = result.choices[0];

          if (typeof choice?.message?.content === "string") {
            reply = choice.message.content;
          }

          if (!reply && typeof choice?.text === "string") {
            reply = choice.text;
          }
        }

        if (!reply || !reply.trim() || reply.trim() === "null") {
          console.error("NOA: пустой ответ модели", result);

          return json({
            reply:
              "NOA не получила текстовый ответ от модели. Попробуй отправить сообщение ещё раз."
          });
        }

        return json({
          reply: reply.trim()
        });

      } catch (error) {
        console.error("NOA API error:", error);

        return json({
          reply:
            "У NOA возникла небольшая ошибка. Попробуй отправить сообщение ещё раз."
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
