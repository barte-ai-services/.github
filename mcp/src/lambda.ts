import { handbook } from "./content.js";
import { createHandler } from "./handler.js";

// The Lambda entry. The function and its API live in barte-ai-services/infra (control-plane/handbook-mcp).
export const handler = createHandler(handbook);
