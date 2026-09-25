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
          (Array.isArray(body.messages)
            ? body.messages[body.messages.length - 1]?.content
            : null);

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

        const response = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-5.6-luna",
              instructions:
                "Ты NOA — дружелюбный персональный ИИ-ассистент. Отвечай понятно, полезно и на языке пользователя.",
              input: userMessage
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return new Response(
            JSON.stringify({
              error: data.error?.message || "Ошибка OpenAI API"
            }),
            {
              status: response.status,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        const reply =
          data.output_text ||
          data.output
            ?.flatMap(item => item.content || [])
            ?.filter(item => item.type === "output_text")
            ?.map(item => item.text)
            ?.join("") ||
          "NOA не смог получить ответ.";

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
            error: "Ошибка сервера NOA"
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

    // Открываем интерфейс NOA
    return env.ASSETS.fetch(request);
  }
};
