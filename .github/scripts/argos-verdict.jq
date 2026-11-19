# Decides whether auto-merge.yml may enable auto-merge on a PR (barte-ai-services/.github#56).
#
# Input: {pr, head, app, writers, labels, comments}
#   pr        the PR number
#   head      the PR's head commit, 40 hex digits
#   app       the Argos app's login, e.g. "argos-by-ahrena[bot]"
#   writers   logins with write access or more to the repository
#   labels    the PR's label names
#   comments  the PR's issue comments, as the REST API returns them
# Output: one line, "approve <why>", "wait <why>" or "stale <sha> <why>". stale means the most
# recent verdict is an approve of an earlier commit: the caller enables or keeps auto-merge only if
# the head adds nothing but merges of the base on top of <sha> (only-base-merges.sh).
#
# An Argos verdict is read from two formats:
#   - a session's comment, by a writer: first line `<!-- ahrena-review:<pr>:<sha> verdict=<v> -->`,
#     where sha is at least 7 hex digits of the reviewed commit;
#   - the CI Argos comment (argos.yml), by the app: first line `<!-- ahrena-review -->`, a
#     `**Verdict:** `<v>`` header, `**<n>** bloqueantes` and `<sub>commit <sha40> · ...`.
# Only the verdicts about the current head count, and the most recent of them decides. An approve
# from the CI Argos counts only with 0 blockers. Anything else, or anything unreadable, waits.

def norm: gsub("-"; "_");

def session_verdict($pr; $writers):
  select(.user.login as $l | $writers | index($l))
  | (.body | capture("^<!-- ahrena-review:(?<pr>[0-9]+):(?<sha>[0-9a-f]{7,40}) verdict=(?<v>[a-z_-]+) -->")?) as $m
  | select($m != null and ($m.pr | tonumber) == $pr)
  | {sha: $m.sha, verdict: ($m.v | norm), blocking: 0, at: .updated_at, source: "sessão"};

def ci_verdict($app):
  select(.user.login == $app and (.body | startswith("<!-- ahrena-review -->\n")))
  | .body as $b
  | ([$b | scan("<sub>commit ([0-9a-f]{40}) · ")[0]] | last) as $sha
  | (($b | capture("\\*\\*Verdict:\\*\\* *`(?<v>[a-z_]+)`")?) // ($b | capture("\\*\\*Argos\\*\\* · verdict `(?<v>[a-z_]+)`")?)) as $v
  | ([$b | scan("\\*\\*([0-9]+)\\*\\* bloqueantes")[0]] | first) as $blocking
  | select($sha != null and $v != null)
  | {sha: $sha, verdict: $v.v, blocking: (($blocking // "") | tonumber? // null), at: .updated_at, source: "CI"};

. as $in
| ($in.head[0:7]) as $short
| if ($in.labels | index("argos:hold")) then "wait argos:hold"
  elif ($in.head | test("^[0-9a-f]{40}$") | not) then "wait head ilegível"
  else
    [$in.comments[] | (session_verdict($in.pr; $in.writers), ci_verdict($in.app))] as $all
    | [$all[] | select(.sha as $s | $in.head | startswith($s))] | sort_by(.at) as $onhead
    | if ($onhead | length) == 0 then
        if ($all | length) == 0 then "wait sem veredito do Argos"
        else ($all | sort_by(.at) | last) as $l
          | if $l.verdict == "approve" and $l.blocking == 0 then "stale \($l.sha) approve de \($l.sha[0:7]), não do head \($short)"
            else "wait sem veredito do Argos no head \($short) (o último é \($l.verdict) em \($l.sha[0:7]))"
            end
        end
      else ($onhead | last) as $v
        | if $v.verdict == "approve" and $v.blocking == 0 then "approve \($v.source) no head \($short)"
          elif $v.verdict == "approve" then "wait approve com \($v.blocking // "?") bloqueante(s) no head \($short)"
          else "wait \($v.verdict) no head \($short)"
          end
      end
  end
