import generated from "./generated/content.json" with { type: "json" };

// The handbook as the build bundled it (scripts/content.mjs).

export interface Section {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface Page {
  readonly slug: string;
  readonly section: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly body: string;
}

export interface Technology {
  readonly id: string;
  readonly name: string;
  readonly quadrant: string;
  readonly ring: string;
  readonly version?: string;
  readonly what: string;
  readonly how: string;
  readonly replaces?: string;
}

export interface Radar {
  readonly rings: readonly { readonly id: string; readonly name: string; readonly description: string }[];
  readonly quadrants: readonly { readonly id: string; readonly name?: string }[];
  readonly technologies: readonly Technology[];
}

export interface Handbook {
  readonly site: string;
  readonly commit: string;
  readonly sections: readonly Section[];
  readonly pages: readonly Page[];
  readonly radar: Radar | null;
  readonly rules: string;
}

export const handbook = generated as unknown as Handbook;
