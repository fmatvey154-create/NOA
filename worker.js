export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({
          error: "Используй POST-запрос."
        }, 405);
      }

      try {
        const body = await request.json();

        const userMessage =
          body.message ??
          body.prompt ??
          body.text ??
          (
            Array.isArray(body.messages)
              ? body.messages[body.messages.length - 1]?.content
              : null
          );

        if (
          typeof userMessage !== "string" ||
          !userMessage.trim()
        ) {
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
                  "Отвечай понятно, естественно и на языке пользователя."
              },
              {
                role: "user",
                content: userMessage.trim()
              }
            ],
            max_tokens: 1024
          }
        );

        console.log(
          "NOA RESULT:",
          JSON.stringify(result)
        );

        /*
         * Получаем ответ из разных возможных форматов.
         */

        let reply = "";

        const choice = result?.choices?.[0];

        if (typeof choice?.message?.content === "string") {
          reply = choice.message.content;
        }

        if (!reply && Array.isArray(choice?.message?.content)) {
          reply = choice.message.content
            .map(item => {
              if (typeof item === "string") return item;
              return item?.text || item?.content || "";
            })
            .filter(Boolean)
            .join("\n");
        }

        if (!reply && typeof choice?.text === "string") {
          reply = choice.text;
        }

        if (!reply && typeof result?.response === "string") {
          reply = result.response;
        }

        if (!reply && typeof result?.output_text === "string") {
          reply = result.output_text;
        }

        /*
         * Иногда content может находиться глубже.
         */

        if (!reply && choice?.message) {
          const message = choice.message;

          if (typeof message.content === "object") {
            reply = JSON.stringify(message.content);
          }
        }

        reply = String(reply || "").trim();

        if (!reply) {
          console.error(
            "NOA EMPTY RESPONSE:",
            JSON.stringify(result)
          );

          return json({
            error: "NOA получила ответ модели, но не смогла извлечь текст.",
            debug: {
              hasChoices: Array.isArray(result?.choices),
              choicesCount: result?.choices?.length || 0,
              firstChoice: result?.choices?.[0] || null
            }
          }, 502);
        }

        return json({
          reply
        });

      } catch (error) {
        console.error(
          "NOA ERROR:",
          String(error?.stack || error)
        );

        return json({
          error: "Ошибка Workers AI.",
          details: String(error?.message || error)
        }, 500);
      }
    }

    if (!env.ASSETS) {
      return new Response(
        "NOA: ASSETS binding not found",
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
