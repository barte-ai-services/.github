"""The Argos reusable releases the merge on an approve with 0 blockers, and opens the follow-ups.

Runs the follow-ups step and the hold step of .github/workflows/argos.yml, read as text with the
standard library only, against a fake `gh` defined as a shell function, which logs each call with
the token it ran under. Needs bash and jq on the PATH, as the runner has them.

    python3 -m unittest discover -s .github/scripts -v
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[1] / "workflows" / "argos.yml"
TEXT = WORKFLOW.read_text(encoding="utf-8")


def step(marker: str) -> str:
    """The run script of the step whose header contains the marker."""
    at = TEXT[TEXT.index(marker) :]
    block = at[at.index("        run: |\n") + len("        run: |\n") :]
    lines = []
    for line in block.splitlines():
        if line and not line.startswith(" " * 10):
            break
        lines.append(line[10:])
    return "\n".join(lines) + "\n"


def condition(marker: str) -> str:
    """The `if:` of the step whose header contains the marker, on one line."""
    at = TEXT[TEXT.index(marker) :]
    block = at[at.index("        if: >-\n") + len("        if: >-\n") :]
    lines = []
    for line in block.splitlines():
        if not line.startswith(" " * 10):
            break
        lines.append(line.strip())
    return " ".join(lines)


# The fake gh: answers by the call, and fails the calls the scenario says the token cannot make.
FAKE_GH = r"""
gh() {
  echo "gh $* [token=${GH_TOKEN:-}]" >> "$LOG"
  case "$*" in
    "pr view"*"--json labels"*) echo "enhancement,ci";;
    "pr view"*"--json autoMergeRequest"*) echo "${AUTOMERGE:-false}";;
    "api --paginate repos/o/r/issues"*)
      [ "${GH_TOKEN:-}" = "${DENY_READ:-none}" ] && return 1
      [ -n "${KNOWN:-}" ] && printf '7\t%s\n' "$KNOWN";;
    "api repos/o/r/issues -f"*)
      case " ${DENY_CREATE:-} " in *" ${GH_TOKEN:-} "*) return 1;; esac
      echo 42;;
    *) ;;
  esac
  return 0
}
"""


def key(file: str, title: str) -> str:
    return hashlib.sha256(f"{file}\n{title}".encode()).hexdigest()[:12]


class Run:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.log = root / "log"
        self.log.touch()

    def __call__(self, script: str, **env: str) -> subprocess.CompletedProcess[str]:
        path = self.root / "step.sh"
        path.write_text(FAKE_GH + script)
        base = {
            "PATH": os.environ["PATH"],
            "LOG": str(self.log),
            "RUNNER_TEMP": str(self.root),
            "GITHUB_OUTPUT": str(self.root / "output"),
            "GITHUB_STEP_SUMMARY": str(self.root / "summary"),
            "PR": "5",
            "HEAD": "a" * 40,
            "REPO": "o/r",
            "PR_URL": "https://github.com/o/r/pull/5",
            "PR_CREATED": "2026-11-01T00:00:00Z",
        }
        return subprocess.run(
            ["bash", "-e", str(path)], env={**base, **env}, capture_output=True, text=True
        )

    def calls(self) -> list[str]:
        return self.log.read_text().splitlines()


WARNING = {"severity": "warning", "title": "nome pouco claro", "file": "src/x.ts", "line": 12, "kind": "como"}
OTHER = {"severity": "warning", "title": "escopo", "file": "a.py", "kind": "oque", "rule": "r"}


class FollowUps(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        findings = [WARNING, {"severity": "blocking", "title": "não conta"}, OTHER]
        (self.root / "review.json").write_text(json.dumps({"findings": findings}))
        self.run_step = Run(self.root)
        self.script = step("- name: os follow-ups, quando o Argos aprova com warnings")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def listed(self) -> str:
        return (self.root / "followups.md").read_text()

    def test_each_warning_becomes_an_issue_that_names_the_pr(self) -> None:
        """#45/AC-2"""
        done = self.run_step(self.script, APP_TOKEN="app", JOB_TOKEN="job")
        self.assertEqual(done.returncode, 0, done.stderr)
        creates = [c for c in self.run_step.calls() if c.startswith("gh api repos/o/r/issues -f")]
        self.assertEqual(len(creates), 2)
        self.assertIn("title=Follow-up de #5: nome pouco claro", creates[0])
        body = (self.root / f"followup-{key('src/x.ts', 'nome pouco claro')}.md").read_text()
        self.assertIn("Follow-up de #5 (https://github.com/o/r/pull/5)", body)
        self.assertIn(f"<!-- argos-follow-up pr=5 key={key('src/x.ts', 'nome pouco claro')} -->", body)
        self.assertIn("- #42 · nome pouco claro `src/x.ts:12`", self.listed())

    def test_the_job_token_opens_it_while_the_app_cannot(self) -> None:
        """#45/AC-2: the app first, then the github.token; labels and type with the one that opened it."""
        self.run_step(self.script, APP_TOKEN="app", JOB_TOKEN="job", DENY_CREATE="app")
        calls = self.run_step.calls()
        self.assertTrue(any("issues -f" in c and "[token=job]" in c for c in calls))
        self.assertTrue(any(c.startswith("gh issue edit 42") and "[token=job]" in c for c in calls))
        self.assertTrue(any("-f type=Task" in c and "[token=job]" in c for c in calls))

    def test_a_warning_that_has_an_issue_is_not_opened_again(self) -> None:
        """#45/AC-3"""
        self.run_step(self.script, APP_TOKEN="app", JOB_TOKEN="job", KNOWN=key("a.py", "escopo"))
        creates = [c for c in self.run_step.calls() if c.startswith("gh api repos/o/r/issues -f")]
        self.assertEqual(len(creates), 1)
        self.assertIn("- #7 · escopo `a.py`", self.listed())

    def test_without_permission_the_warning_is_listed_and_the_step_passes(self) -> None:
        """#45/AC-4"""
        done = self.run_step(self.script, APP_TOKEN="app", JOB_TOKEN="job", DENY_CREATE="app job")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("- não aberto (sem permissão para abrir issue) · nome pouco claro", self.listed())

    def test_the_step_never_holds_the_merge(self) -> None:
        """#45/AC-4: the step may fail and the merge steps still run."""
        at = TEXT[TEXT.index("- name: os follow-ups, quando o Argos aprova com warnings") :]
        self.assertIn("continue-on-error: true", at[: at.index("run: |")])

    def test_only_an_approve_with_no_blocker_and_no_fix_opens_follow_ups(self) -> None:
        """#45/AC-2 #45/AC-7"""
        cond = condition("- name: os follow-ups, quando o Argos aprova com warnings")
        for part in (
            "steps.argos.outputs.verdict == 'approve'",
            "steps.argos.outputs.blocking == '0'",
            "steps.argos.outputs.fixed != 'true'",
        ):
            self.assertIn(part, cond)


class Hold(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.run_step = Run(Path(self.tmp.name))
        self.script = step("- name: o argos:hold, quando o Argos não libera o merge")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_an_approve_with_no_blocker_lifts_the_hold_whatever_the_decisor(self) -> None:
        """#45/AC-1"""
        self.run_step(
            self.script, GH_TOKEN="app", VERDICT="approve", BLOCKING="0", FIXED="false",
            DECISION="hold_for_human: risco=medium, auto_merge=0.16",
        )
        calls = self.run_step.calls()
        self.assertTrue(any("--remove-label argos:hold" in c for c in calls))
        self.assertFalse(any("--add-label" in c for c in calls))

    def test_anything_else_holds_and_turns_auto_merge_off(self) -> None:
        """#45/AC-5"""
        for verdict, blocking in (("request_changes", "1"), ("approve", "1"), ("comment", "0"), ("", "")):
            with self.subTest(verdict=verdict, blocking=blocking):
                self.run_step.log.write_text("")
                self.run_step(
                    self.script, GH_TOKEN="app", VERDICT=verdict, BLOCKING=blocking, FIXED="false",
                    DECISION="auto_merge: risco=low", AUTOMERGE="true",
                )
                calls = self.run_step.calls()
                self.assertTrue(any("--add-label argos:hold" in c for c in calls))
                self.assertTrue(any("--disable-auto" in c for c in calls))

    def test_the_hold_is_the_apps(self) -> None:
        """#45/AC-6"""
        at = TEXT[TEXT.index("- name: o argos:hold, quando o Argos não libera o merge") :]
        self.assertIn("GH_TOKEN: ${{ steps.app.outputs.token || github.token }}", at[: at.index("run: |")])

    def test_an_erodos_fix_leaves_the_decision_to_the_next_review(self) -> None:
        """#45/AC-7"""
        self.run_step(self.script, GH_TOKEN="app", VERDICT="approve", BLOCKING="0", FIXED="true", DECISION="fixed: rodada 1")
        self.assertEqual(self.run_step.calls(), [])


class Merge(unittest.TestCase):
    def test_auto_merge_needs_an_approve_with_no_blocker_and_no_fix(self) -> None:
        """#45/AC-1 #45/AC-7: the Decisor is not in the condition."""
        cond = condition("- name: o merge, quando o Argos aprova com 0 bloqueantes")
        self.assertIn("steps.argos.outputs.verdict == 'approve'", cond)
        self.assertIn("steps.argos.outputs.blocking == '0'", cond)
        self.assertIn("steps.argos.outputs.fixed != 'true'", cond)
        self.assertNotIn("decision", cond)

    def test_the_erodos_pushes_with_the_apps_token_only(self) -> None:
        """#45/AC-7"""
        self.assertIn("ARGOS_PUSH_TOKEN: ${{ steps.app.outputs.token }}", TEXT)
        self.assertIn("ARGOS_FIX: ${{ inputs.fix && steps.app.outputs.token != '' }}", TEXT)


if __name__ == "__main__":
    unittest.main()
