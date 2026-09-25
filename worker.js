export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Пока просто проверяем, что Worker работает
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return new Response(
        JSON.stringify({
          reply: "NOA Worker работает! Теперь подключим настоящий ИИ."
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Для остальных запросов отдаём страницу NOA
    return env.ASSETS.fetch(request);
  }
};
