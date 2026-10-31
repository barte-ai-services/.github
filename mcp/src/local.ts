import { createServer as createHttpServer, type IncomingMessage } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handbook } from "./content.js";
import { createHandler } from "./handler.js";

// Local dev: the Lambda handler behind a plain HTTP server, on 127.0.0.1 only.
const HOST = "127.0.0.1";
const PORT = Number(process.env.BARTE_HANDBOOK_MCP_PORT ?? 8788);
const handler = createHandler(handbook);

async function toEvent(request: IncomingMessage): Promise<APIGatewayProxyEventV2> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const url = new URL(request.url ?? "/", `http://${HOST}`);
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers[name] = value;
  }
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    body: Buffer.concat(chunks).toString("utf8"),
    isBase64Encoded: false,
    requestContext: { http: { method: request.method ?? "GET" }, domainName: `${HOST}:${PORT}` },
  } as unknown as APIGatewayProxyEventV2;
}

createHttpServer((request, response) => {
  void toEvent(request)
    .then(handler)
    .then((result) => {
      response.writeHead(result.statusCode ?? 200, result.headers as Record<string, string>);
      response.end(result.body);
    });
}).listen(PORT, HOST, () => {
  console.log(`handbook MCP on http://${HOST}:${PORT}/mcp (${handbook.pages.length} pages)`);
});
