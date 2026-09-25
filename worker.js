export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // API NOA
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();

        const userMessage =
          body.message ||
          body.prompt ||
          body.text ||
          (
            Array.isArray(body.messages)
              ? body.messages[body.messages.length - 1]?.content
              : null
          );

        if (!userMessage) {
          return new Response(
            JSON.stringify({
              error: "Сообщение не найдено"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        const result = await env.AI.run(
          "@cf/zai-org/glm-4.7-flash",
          {
            messages: [
              {
                role: "system",
                content:
                  "Ты NOA — дружелюбный персональный AI-ассистент. Отвечай понятно, полезно и на языке пользователя."
              },
              {
                role: "user",
                content: userMessage
              }
            ]
          }
        );

        const reply =
          result?.response ||
          result?.result?.response ||
          "NOA не смог сформировать ответ.";

        return new Response(
          JSON.stringify({
            reply
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Ошибка Workers AI: " + error.message
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    // Интерфейс NOA
    return env.ASSETS.fetch(request);
  }
};
