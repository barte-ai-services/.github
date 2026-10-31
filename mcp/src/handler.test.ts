import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { describe, expect, it } from "vitest";
import type { Handbook } from "./content.js";
import { createHandler } from "./handler.js";

const fixture: Handbook = {
  site: "https://example.test/handbook",
  commit: "abc123",
  rules: "<!-- barte:handbook:start -->\n- Issue primeiro.\n<!-- barte:handbook:end -->",
  sections: [
    { id: "how-we-work", title: "Como trabalhamos", description: "O caminho de uma mudança" },
    { id: "specifications", title: "Especificações", description: "Os padrões de API" },
  ],
  pages: [
    {
      slug: "how-we-work/pull-requests",
      section: "how-we-work",
      title: "Pull requests",
      description: "O ci é o único check obrigatório.",
      url: "https://example.test/handbook/how-we-work/pull-requests/",
      body: "Ligue o auto-merge ao abrir o PR.",
    },
    {
      slug: "specifications/restful/pagination",
      section: "specifications",
      title: "Paginação",
      description: "O padrão de paginação.",
      url: "https://example.test/handbook/specifications/restful/pagination/",
      body: "O `page_size` padrão é 20 e o máximo é 100.",
    },
  ],
  radar: {
    rings: [
      { id: "adopt", name: "Adopt", description: "o padrão" },
      { id: "hold", name: "Hold", description: "não use em projeto novo" },
    ],
    quadrants: [{ id: "tools" }],
    technologies: [
      { id: "floci", name: "Floci", quadrant: "tools", ring: "adopt", what: "AWS local", how: "No compose." },
      {
        id: "localstack",
        name: "LocalStack",
        quadrant: "tools",
        ring: "hold",
        what: "AWS local",
        how: "Não use.",
        replaces: "floci",
      },
    ],
  },
};

const handler = createHandler(fixture);

function event(path: string, body?: unknown): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: "",
    headers: {
      host: "example.test",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    isBase64Encoded: false,
    requestContext: { http: { method: "POST" }, domainName: "example.test" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  } as unknown as APIGatewayProxyEventV2;
}

async function call(
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ text: string; isError?: boolean }> {
  const result = await handler(
    event("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  );
  const parsed = JSON.parse(String(result.body)) as {
    result: { content: { text: string }[]; isError?: boolean };
  };
  return {
    text: parsed.result.content.map((c) => c.text).join("\n"),
    ...(parsed.result.isError ? { isError: true } : {}),
  };
}

describe("the handbook MCP", () => {
  it("answers 404 off /mcp", async () => {
    const result = await handler(event("/other", {}));
    expect(result.statusCode).toBe(404);
  });

  it("lists the five read-only tools", async () => {
    const result = await handler(event("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const tools = (JSON.parse(String(result.body)) as { result: { tools: { name: string }[] } }).result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual([
      "check_technology",
      "get_rules",
      "list_sections",
      "read_page",
      "search",
    ]);
  });

  it("returns the rules with the version", async () => {
    const { text } = await call("get_rules");
    expect(text).toContain("Issue primeiro.");
    expect(text).toContain("abc123");
  });

  it("lists sections with the radar page", async () => {
    const { text } = await call("list_sections");
    expect(text).toContain("`how-we-work/pull-requests`");
    expect(text).toContain("`specifications/tech-radar`");
  });

  it("reads a page and refuses an unknown slug", async () => {
    expect((await call("read_page", { slug: "/how-we-work/pull-requests/" })).text).toContain("auto-merge");
    expect((await call("read_page", { slug: "nope" })).isError).toBe(true);
  });

  it("finds a page by a word without its accent", async () => {
    const { text } = await call("search", { query: "paginacao" });
    expect(text.split("\n")[0]).toContain("specifications/restful/pagination");
  });

  it("says a technology on hold and what to use instead", async () => {
    const { text } = await call("check_technology", { technology: "localstack" });
    expect(text).toContain("Hold");
    expect(text).toContain("Use no lugar: Floci");
  });

  it("says a technology off the radar is not approved", async () => {
    expect((await call("check_technology", { technology: "Cobol" })).text).toContain("não é homologada");
  });
});
