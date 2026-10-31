import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Handbook } from "./content.js";
import { registerTools } from "./tools.js";

export const SERVER_NAME = "Barte Handbook";
export const SERVER_VERSION = "0.1.0";

export function createServer(handbook: Handbook): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "O handbook de engenharia da Barte. Leia get_rules antes de trabalho de engenharia num repositório da Barte, consulte check_technology antes de adotar uma tecnologia, e use search e read_page para os processos e as especificações.",
    },
  );
  registerTools(server, handbook);
  return server;
}
