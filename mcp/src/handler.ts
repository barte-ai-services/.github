import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { Handbook } from "./content.js";
import { createServer } from "./server.js";

export const MCP_PATH = "/mcp";

function header(event: APIGatewayProxyEventV2, name: string): string | undefined {
  return event.headers[name] ?? event.headers[name.toLowerCase()];
}

function toRequest(event: APIGatewayProxyEventV2): Request {
  const host = header(event, "host") ?? event.requestContext.domainName;
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers)) {
    if (value !== undefined) headers.set(name, value);
  }
  const method = event.requestContext.http.method;
  const body =
    event.body === undefined || method === "GET" || method === "HEAD"
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;
  return new Request(`https://${host}${event.rawPath}${query}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
}

async function toResult(response: Response): Promise<APIGatewayProxyStructuredResultV2> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name] = value;
  });
  return { statusCode: response.status, headers, body: await response.text() };
}

function notFound(): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 404, headers: { "content-type": "application/json" }, body: "{}" };
}

// Public and read-only, with no caller identity: the content is the public handbook (infra ADR on its
// exposure). A stateless server per request, so nothing is kept between calls.
export function createHandler(handbook: Handbook) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    if (event.rawPath !== MCP_PATH) return notFound();
    const server = createServer(handbook);
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await toResult(await transport.handleRequest(toRequest(event)));
    } finally {
      await server.close();
    }
  };
}
