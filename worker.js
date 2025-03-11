// This is the code that is currently used in the Worker.

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  let targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    targetUrl = "https://example.com"; // Fallback URL
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      redirect: "follow",
      credentials: "omit" // Ensure credentials are not sent to avoid restrictions
    });

    const contentType = response.headers.get("Content-Type") || "";
    let body = await response.arrayBuffer(); // Ensure binary-safe response handling

    if (contentType.includes("text/html")) {
      let text = new TextDecoder().decode(body);
      text = text.replace(/(href|src)=(\"|\')(\/[^\/].*?)\2/g, `$1=$2${targetUrl}$3$2`);
      
      // Modify links to open within the proxy if they don’t open in a new tab
      text = text.replace(/<a(?![^>]*target=)/g, '<a target="_self"');
      
      body = new TextEncoder().encode(text);
    }

    const modifiedHeaders = new Headers(response.headers);
    modifiedHeaders.set("Access-Control-Allow-Origin", "*");
    modifiedHeaders.set("Access-Control-Allow-Methods", "*");
    modifiedHeaders.set("Access-Control-Allow-Headers", "*");
    modifiedHeaders.set("Access-Control-Expose-Headers", "*"); // Ensure all headers are visible
    modifiedHeaders.delete("X-Frame-Options");
    modifiedHeaders.delete("Content-Security-Policy");

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: modifiedHeaders
    });
  } catch (error) {
    return new Response(`Error fetching URL: ${error.message}`, { status: 500 });
  }
}
