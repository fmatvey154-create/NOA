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
          const messages = body.messages.filter(
            m => m && m.role !== "system"
          );

          userMessage = messages[messages.length - 1]?.content ?? null;
        }

        if (typeof userMessage !== "string" ||
            !userMessage.trim()) {
          return json({
            error: "Сообщение не найдено."
          }, 400);
        }

        if (!env.AI) {
          return json({
            error: "Workers AI не подключён. Проверь Binding AI."
          }, 500);
        }

        const result = await env.AI.run(
          "@cf/zai-org/glm-4.7-flash",
          {
            messages: [
              {
                role: "system",
                content:
                  "Ты NOA — персональный AI-ассистент. " +
                  "Отвечай понятно, полезно и на языке пользователя."
              },
              {
                role: "user",
                content: userMessage.trim()
              }
            ],
            max_tokens: 1024
          }
        );

        console.log("NOA result:", JSON.stringify(result));

        // Извлекаем текст из разных форматов ответа
        function extractText(value) {
          if (typeof value === "string") {
            return value;
          }

          if (Array.isArray(value)) {
            return value
              .map(extractText)
              .filter(Boolean)
              .join("\n");
          }

          if (!value || typeof value !== "object") {
            return "";
          }

          if (typeof value.response === "string") {
            return value.response;
          }

          if (typeof value.output_text === "string") {
            return value.output_text;
          }

          if (typeof value.text === "string") {
            return value.text;
          }

          if (typeof value.content === "string") {
            return value.content;
          }

          if (value.message?.content) {
            return extractText(value.message.content);
          }

          if (value.choices?.[0]?.message?.content) {
            return extractText(value.choices[0].message.content);
          }

          if (value.choices?.[0]?.text) {
            return value.choices[0].text;
          }

          if (value.result) {
            return extractText(value.result);
          }

          if (value.output) {
            return extractText(value.output);
          }

          if (value.content) {
            return extractText(value.content);
          }

          return "";
        }

        const reply =
  result?.choices?.[0]?.message?.content ??
  result?.choices?.[0]?.text ??
  result?.response ??
  result?.output_text ??
  "";

const finalReply =
  typeof reply === "string"
    ? reply.trim()
    : extractText(reply).trim();

     if (!finalReply) {
  console.error(
    "NOA choices:",
    JSON.stringify(result?.choices)
  );

  return json({
    error: "Модель вернула пустой ответ.",
    debug: JSON.stringify(result?.choices)
  }, 502);
} 
        return json({ reply: finalReply });

      } catch (error) {
        console.error("NOA error:", error);

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
