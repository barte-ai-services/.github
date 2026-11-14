"""The Argos reusable runs the model on a head it does not trust, and no model output becomes code.

Reads .github/workflows/argos.yml as text with the standard library only. Two kinds of check:

- static: what the file says (managed settings mounted read-only, a copy of the checkout mounted
  instead of the workspace, no `${{ }}` inside a `run:` block);
- run: the `argos` step and the `inherit` step executed with bash, jq and git, against a fake
  `docker` that logs its arguments and prints a fixed review, with hostile model output.

    python3 -m unittest discover -s .github/scripts -v

barte-ai-services/.github#50 (the head's own Claude Code settings, hooks and MCP servers) and
barte-ai-services/.github#51 (validate the verdict before a step uses it).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

from test_argos_inherit import Fixture, comment

WORKFLOW = Path(__file__).resolve().parents[1] / "workflows" / "argos.yml"
TEXT = WORKFLOW.read_text(encoding="utf-8")
MANAGED_PATH = "/etc/claude-code/managed-settings.json"
SHA = "a" * 40
OUTPUT_KEYS = {"verdict", "blocking", "decision", "fixed"}
RUN_OPEN = "        run: |"
BODY_INDENT = " " * 10

# The head's Claude Code project configuration (#50): settings, MCP servers, personal memory.
HEAD_CONFIG_TRACKED = [".claude/settings.json", ".claude/agents/x.md", ".mcp.json"]
HEAD_CONFIG_UNTRACKED = [".claude/settings.local.json", "CLAUDE.local.md"]
HEAD_CONFIG = [".claude", ".mcp.json", "CLAUDE.local.md"]

# Managed deny rules (#50): the job's environment, the managed file, and the tools the runtime never grants.
TOKENS = ["CLAUDE_KEY", "GH_TOKEN", "ARGOS_PUSH_TOKEN", "APP_TOKEN", "CLOUDFLARE_API_TOKEN"]
DENIED = ["Read(//proc/**)", "Read(//sys/**)", "Read(//etc/claude-code/**)", "Bash", "WebFetch", "WebSearch"]

# Keys the head's `.claude/settings.json` could use to run a command or reach a server, and that the
# managed file closes (#50). Each was confirmed against Claude Code 2.1.296, the one in the pinned image.
CLOSED = {
    "disableAllHooks": True,
    "allowManagedHooksOnly": True,
    "enableAllProjectMcpServers": False,
    "allowManagedMcpServersOnly": True,
    "allowedMcpServers": [],
    "strictKnownMarketplaces": [],
    "disableSkillShellExecution": True,
    "apiKeyHelper": "",
    "awsAuthRefresh": "",
    "awsCredentialExport": "",
    "gcpAuthRefresh": "",
    "otelHeadersHelper": "",
    "proxyAuthHelper": "",
}


def _indented_body(lines: list[str]) -> str:
    """The script that opens at lines[0]: every line indented ten spaces, up to the first that is not."""
    body = []
    for line in lines:
        if line and not line.startswith(BODY_INDENT):
            break
        body.append(line[len(BODY_INDENT) :])
    return "\n".join(body) + "\n"


def run_blocks() -> list[tuple[int, str]]:
    """Every `run: |` script of the workflow, with the line it starts on."""
    lines = TEXT.splitlines()
    return [(at + 1, _indented_body(lines[at + 1 :])) for at, line in enumerate(lines) if line == RUN_OPEN]


def step_script(step_id: str) -> str:
    """The run script of the step with this id."""
    after_id = TEXT[TEXT.index(f"        id: {step_id}\n") :]
    return _indented_body(after_id[after_id.index(RUN_OPEN + "\n") + len(RUN_OPEN) + 1 :].splitlines())


def header() -> str:
    """The comment block above `on:`."""
    return TEXT[: TEXT.index("\non:\n")]


class StaticChecks(unittest.TestCase):
    def test_no_run_block_interpolates_an_expression(self) -> None:
        """#51/AC-1: nothing the model wrote reaches a script through ${{ }}, so no run block has one."""
        for line, script in run_blocks():
            self.assertNotIn("${{", script, f"the run block at line {line} interpolates an expression")

    def test_no_run_block_reads_a_step_output_by_expression(self) -> None:
        """#51/AC-1: the verdict, the blocking count, the decision and the fixed flag go in by env."""
        for line, script in run_blocks():
            for step in ("argos", "inherit"):
                self.assertNotIn(f"steps.{step}.outputs", script, f"the run block at line {line} names a step output")

    def test_the_container_reads_managed_settings_read_only(self) -> None:
        """#50: the head cannot switch its own hooks and MCP servers back on."""
        self.assertIn(f"{MANAGED_PATH}:ro", TEXT)

    def test_the_workspace_is_not_what_the_container_mounts(self) -> None:
        """#50: the container works on a copy, so it cannot reach the workspace's .git."""
        self.assertNotIn('"$PWD:/repo"', TEXT)
        self.assertNotIn("$GITHUB_WORKSPACE:/repo", TEXT)
        self.assertIn("cp -a", TEXT)

    def test_the_header_does_not_claim_the_runner_runs_nothing_from_the_pr(self) -> None:
        """#50: the old claim was false, and the header says what the head can and cannot do."""
        self.assertNotIn("o runner não executa nada que veio do PR", header())
        self.assertIn("managed-settings", header())

    def test_permission_rules_are_not_locked_to_managed(self) -> None:
        """allowManagedPermissionRulesOnly would drop the Edit and Write grants the Erodos runs with, and the
        Bash rules of the commands a project declares (#50): the head's rules are kept away by removing the
        head's `.claude/` from the copy, and the managed deny rules close the rest."""
        heredoc = TEXT[TEXT.index("<<'MANAGED'") : TEXT.index("\n          MANAGED\n")]
        self.assertIn("disableAllHooks", heredoc)
        self.assertNotIn("allowManagedPermissionRulesOnly", heredoc)


    def test_the_head_s_project_config_is_removed_on_the_host_before_the_container(self) -> None:
        """#50: removed from the copy, skip-worktree so the Erodos does not commit the removal, and the host
        runs git on the copy only before the container starts."""
        script = step_script("argos")
        before, after = script.split("docker run", 1)
        self.assertIn("update-index --skip-worktree", before)
        self.assertIn('ls-files -z -- .claude .mcp.json CLAUDE.local.md', before)
        self.assertIn('rm -rf "$repo_copy/.claude" "$repo_copy/.mcp.json" "$repo_copy/CLAUDE.local.md"', before)
        self.assertNotIn('git -C "$repo_copy"', after, "no git on the copy after the container ran")
        self.assertNotIn("git ", after.split('"$ARGOS_IMAGE"', 1)[1].split("review.log", 1)[0])

    def test_the_header_states_what_the_head_reaches_and_what_it_does_not(self) -> None:
        """#50: the claims that the head's rules widen nothing, and that the rest only closes in the runtime,
        were false, and the header names the real mechanism, the trade-off and the root fix."""
        text = header()
        self.assertNotIn("alargam nada", text)
        self.assertNotIn("só se fecha no runtime", text)
        self.assertNotIn("widen nothing", step_script("argos"))
        for needle in ("skip-worktree", "CLAUDE.local.md", "settingSources", "allowManagedPermissionRulesOnly"):
            self.assertIn(needle, text)

    def test_the_managed_file_denies_what_the_model_must_not_read_or_run(self) -> None:
        """#50: the reads that reach the job's tokens, and the tools the runtime never grants."""
        heredoc = TEXT[TEXT.index("<<'MANAGED'") : TEXT.index("\n          MANAGED\n")]
        for rule in DENIED:
            self.assertIn(f'"{rule}"', heredoc)
        self.assertIn('"disableBypassPermissionsMode": "disable"', heredoc)


class Workspace:
    """A checkout, a fake docker, and the environment the `argos` step runs in."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.workspace = root / "workspace"
        self.temp = root / "temp"
        self.workspace.mkdir()
        self.temp.mkdir()
        for args in (["init", "-q", "-b", "main"], ["config", "user.email", "t@example.com"], ["config", "user.name", "t"]):
            subprocess.run(["git", *args], cwd=self.workspace, check=True, capture_output=True)
        (self.workspace / "app.py").write_text("print('hi')\n")
        (self.workspace / "CLAUDE.md").write_text("# project notes\n")
        for name in HEAD_CONFIG_TRACKED:
            (self.workspace / name).parent.mkdir(parents=True, exist_ok=True)
            (self.workspace / name).write_text("{}\n")
        subprocess.run(["git", "add", "-A"], cwd=self.workspace, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-q", "-m", "init"], cwd=self.workspace, check=True, capture_output=True)
        for name in HEAD_CONFIG_UNTRACKED:
            (self.workspace / name).write_text("{}\n")
        bin_dir = root / "bin"
        bin_dir.mkdir()
        docker = bin_dir / "docker"
        # Logs the arguments, snapshots what the /repo mount holds (#50), and prints the fixed review.
        docker.write_text(
            "#!/bin/bash\n"
            'printf \'%s\\n\' "$@" > "$DOCKER_ARGS"\n'
            'for a in "$@"; do case "$a" in *:/repo) src="${a%:/repo}"\n'
            '  { ls -A "$src"; git -C "$src" rev-parse HEAD; } > "$DOCKER_ARGS.repo" 2>&1\n'
            '  git -C "$src" status --porcelain > "$DOCKER_ARGS.status" 2>&1\n'
            '  if [ -n "$FAKE_ERODOS" ]; then\n'
            '    git -C "$src" checkout --quiet --detach "$HEAD"\n'
            '    echo "print(2)" >> "$src/app.py"\n'
            '    git -C "$src" add --all\n'
            '    git -C "$src" -c user.name=e -c user.email=e@example.com commit --quiet --no-verify -m fix\n'
            '    git -C "$src" show --name-status --format= HEAD > "$DOCKER_ARGS.commit" 2>&1\n'
            '    ls -A "$src" > "$DOCKER_ARGS.after"\n'
            '    git -C "$src" status --porcelain > "$DOCKER_ARGS.status-after" 2>&1\n'
            '  fi;; esac; done\n'
            'cat "$FAKE_REVIEW"\n'
        )
        docker.chmod(0o755)
        self.path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"
        self.args_file = root / "docker.args"
        self.review_file = root / "fake-review.json"
        self.output = root / "output"
        self.event = root / "event.json"
        self.event.write_text("{}")

    def run(self, review: str | None = None, **env: str) -> tuple[subprocess.CompletedProcess[str], list[str]]:
        self.review_file.write_text(review if review is not None else "{}")
        self.output.write_text("")
        full = {
            **os.environ,
            "PATH": self.path,
            "RUNNER_TEMP": str(self.temp),
            "GITHUB_OUTPUT": str(self.output),
            "GITHUB_EVENT_PATH": str(self.event),
            "GITHUB_STEP_SUMMARY": str(self.root / "summary"),
            "DOCKER_ARGS": str(self.args_file),
            "FAKE_REVIEW": str(self.review_file),
            "ARGOS_IMAGE": "image@sha256:0",
            "PR": "1",
            "BASE": "main",
            "HEAD": SHA,
            "INHERITED": "false",
            "CLAUDE_KEY": "sk-ant-oat-fake",
            **env,
        }
        done = subprocess.run(
            ["bash", "-e", "-c", step_script("argos")],
            cwd=self.workspace,
            env=full,
            capture_output=True,
            text=True,
        )
        lines = self.output.read_text().splitlines()
        return done, lines

    def docker_args(self) -> list[str]:
        return self.args_file.read_text().splitlines()


def outputs(lines: list[str]) -> dict[str, str]:
    """Parse GITHUB_OUTPUT the way the runner does: every line is `key=value`, and a stray line is a defect."""
    parsed: dict[str, str] = {}
    for line in lines:
        assert re.fullmatch(r"(verdict|blocking|decision|fixed)=[^\r\n]*", line), f"unexpected output line: {line!r}"
        key, value = line.split("=", 1)
        assert key not in parsed, f"output {key} written twice"
        parsed[key] = value
    return parsed


class ContainerSetup(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.ws = Workspace(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def mounts(self) -> list[str]:
        args = self.ws.docker_args()
        return [args[i + 1] for i, a in enumerate(args) if a == "-v"]

    def test_the_managed_settings_file_closes_the_head_s_own_settings(self) -> None:
        """#50: written by the runner under RUNNER_TEMP, mounted read-only at the path Claude Code reads."""
        done, _ = self.ws.run()
        self.assertEqual(done.returncode, 0, done.stderr)
        mount = next(m for m in self.mounts() if m.endswith(f"{MANAGED_PATH}:ro"))
        source = Path(mount.split(":")[0])
        self.assertEqual(source.parent, self.ws.temp, "the managed file lives under RUNNER_TEMP")
        managed = json.loads(source.read_text())
        for key, value in CLOSED.items():
            self.assertEqual(managed.get(key), value, key)
        self.assertEqual(managed["env"]["ANTHROPIC_BASE_URL"], "https://api.anthropic.com")
        self.assertNotIn("allowManagedPermissionRulesOnly", managed)
        self.assertEqual(managed["permissions"]["deny"], DENIED)
        self.assertEqual(managed["permissions"]["disableBypassPermissionsMode"], "disable")

    def test_the_container_gets_a_copy_of_the_checkout(self) -> None:
        """#50: a copy under RUNNER_TEMP, with the history, and never the workspace itself."""
        done, _ = self.ws.run()
        self.assertEqual(done.returncode, 0, done.stderr)
        mount = next(m for m in self.mounts() if m.endswith(":/repo"))
        source = Path(mount[: -len(":/repo")])
        self.assertNotEqual(source.resolve(), self.ws.workspace.resolve())
        self.assertEqual(source.parent.resolve(), self.ws.temp.resolve())
        seen = Path(f"{self.ws.args_file}.repo").read_text().splitlines()
        self.assertIn(".git", seen, "the copy keeps the history")
        self.assertIn("app.py", seen)
        head = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=self.ws.workspace, check=True, capture_output=True, text=True
        ).stdout.strip()
        self.assertEqual(seen[-1], head, "git reads the copy as the checkout")
        self.assertNotIn(str(self.ws.workspace), " ".join(self.mounts()))

    def test_what_is_mounted_has_none_of_the_head_s_project_config(self) -> None:
        """#50: the head's `.claude/`, `.mcp.json` and `CLAUDE.local.md` never reach the container."""
        done, _ = self.ws.run()
        self.assertEqual(done.returncode, 0, done.stderr)
        seen = Path(f"{self.ws.args_file}.repo").read_text().splitlines()
        for name in HEAD_CONFIG:
            self.assertNotIn(name, seen)
        self.assertIn("CLAUDE.md", seen, "CLAUDE.md is data the model still reads")
        self.assertIn("app.py", seen)
        for name in HEAD_CONFIG_TRACKED + HEAD_CONFIG_UNTRACKED:
            self.assertTrue((self.ws.workspace / name).exists(), f"{name} stays in the runner's workspace")

    def test_the_copy_reads_as_a_clean_checkout(self) -> None:
        """#50: the Erodos holds a checkout that has changes that are not the PR's, so the removal shows none."""
        done, _ = self.ws.run()
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(Path(f"{self.ws.args_file}.status").read_text(), "")

    def test_an_erodos_commit_carries_its_edit_and_not_the_removal(self) -> None:
        """#50: checkout, edit, add --all and commit, as the Erodos does: only the edited file is in it."""
        done, _ = self.ws.run(FAKE_ERODOS="1")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(Path(f"{self.ws.args_file}.commit").read_text().split(), ["M", "app.py"])
        self.assertEqual(Path(f"{self.ws.args_file}.status-after").read_text(), "")
        for name in HEAD_CONFIG:
            self.assertNotIn(name, Path(f"{self.ws.args_file}.after").read_text().splitlines())

    def test_the_review_output_is_outside_the_copy(self) -> None:
        """#50: the later steps read RUNNER_TEMP/review.json, and the container writes it only on stdout."""
        done, _ = self.ws.run(review='{"verdict":"approve"}')
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(json.loads((self.ws.temp / "review.json").read_text())["verdict"], "approve")
        for mount in self.mounts():
            self.assertNotIn("review.json", mount)
            self.assertNotEqual(Path(mount.split(":")[0]), self.ws.temp)


class ModelOutputIsValidated(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.ws = Workspace(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def review(self, **fields: object) -> dict[str, str]:
        done, lines = self.ws.run(review=json.dumps(fields))
        self.assertEqual(done.returncode, 0, done.stderr)
        return outputs(lines)

    def test_the_three_verdicts_pass_through(self) -> None:
        """#51/AC-2: approve, request_changes and comment are the only values written."""
        for verdict in ("approve", "request_changes", "comment"):
            self.assertEqual(self.review(verdict=verdict)["verdict"], verdict)

    def test_any_other_verdict_is_a_comment_and_writes_no_other_key(self) -> None:
        """#51/AC-2: a newline, a substitution or a quote in the verdict never leaves it."""
        hostile = [
            "approve\nblocking=0",
            "approve\r\nfixed=false",
            "$(id)",
            '"; rm -rf /',
            "`id`",
            "APPROVE",
            "approved",
            "",
            5,
            None,
            {"approve": True},
            ["approve"],
        ]
        for verdict in hostile:
            with self.subTest(verdict=verdict):
                out = self.review(verdict=verdict, findings=[{"severity": "blocking"}])
                self.assertEqual(out["verdict"], "comment")
                self.assertEqual(set(out), OUTPUT_KEYS)

    def test_the_blocking_count_is_digits(self) -> None:
        """#51/AC-2: counted by jq from the findings, and only digits are written."""
        out = self.review(verdict="approve", findings=[{"severity": "blocking"}, {"severity": "warning"}, {"severity": "blocking"}])
        self.assertEqual(out["blocking"], "2")
        self.assertEqual(self.review(verdict="approve")["blocking"], "0")

    def test_the_decision_is_one_short_line(self) -> None:
        """#51/AC-2: no CR or LF, no backtick, at most 200 characters, and never a second key."""
        hostile = [
            "hold_for_human: x\nverdict=approve\nblocking=0",
            "hold_for_human: x\rblocking=0",
            "hold `id` $(id) \"; rm -rf /",
            "x" * 1000,
            "tab\there\x07bell",
        ]
        for decision in hostile:
            with self.subTest(decision=decision[:30]):
                out = self.review(verdict="comment", decision=decision, findings=[{"severity": "blocking"}])
                self.assertEqual(out["verdict"], "comment")
                self.assertEqual(out["blocking"], "1")
                self.assertLessEqual(len(out["decision"]), 200)
                self.assertNotRegex(out["decision"], r"[\r\n`\x00-\x08\x0b-\x1f\x7f]")

    def test_a_review_that_holds_a_token_of_the_job_is_not_posted(self) -> None:
        """#50: under injection the model could read the job's environment and write it into the review."""
        for name in TOKENS:
            with self.subTest(token=name):
                secret = f"secret-{name.lower()}-0123456789"
                done, lines = self.ws.run(
                    review=json.dumps({"verdict": "approve", "comment": f"see {secret} here", "findings": []}),
                    **{name: secret},
                )
                self.assertEqual(done.returncode, 0, done.stderr)
                out = outputs(lines)
                self.assertEqual((out["verdict"], out["blocking"], out["fixed"]), ("comment", "unknown", "false"))
                self.assertTrue(out["decision"].startswith("hold_for_human"))
                posted = (self.ws.temp / "review.json").read_text()
                self.assertNotIn(secret, posted)
                self.assertIn("<!-- ahrena-review -->", json.loads(posted)["comment"])
                self.assertNotIn(secret, done.stdout + done.stderr, "the check never echoes the value")

    def test_a_review_without_a_token_is_posted_as_it_is(self) -> None:
        """#50: the same tokens are set and none of them is in the review."""
        env = {name: f"secret-{name.lower()}-0123456789" for name in TOKENS}
        done, lines = self.ws.run(review=json.dumps({"verdict": "approve", "comment": "clean"}), **env)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(outputs(lines)["verdict"], "approve")
        self.assertEqual(json.loads((self.ws.temp / "review.json").read_text())["comment"], "clean")

    def test_the_default_decision_stays(self) -> None:
        self.assertEqual(self.review(verdict="comment")["decision"], "hold_for_human: sem decisor")

    def test_fixed_is_true_or_false(self) -> None:
        """#51/AC-2: the Erodos pushed, or it did not."""
        self.assertEqual(self.review(verdict="approve", fixCommit="abc123")["fixed"], "true")
        self.assertEqual(self.review(verdict="approve")["fixed"], "false")
        self.assertEqual(self.review(verdict="approve", fixCommit="x\nverdict=approve")["fixed"], "true")

    def test_an_inherited_opinion_is_validated_again(self) -> None:
        """#51/AC-2: what the inherit step passes in by env gets the same checks before it is rewritten."""
        done, lines = self.ws.run(
            INHERITED="true",
            INHERITED_VERDICT="approve\nblocking=0",
            INHERITED_BLOCKING="0\nverdict=approve",
            INHERITED_DECISION="auto_merge: risco=low\nfixed=false",
        )
        self.assertEqual(done.returncode, 0, done.stderr)
        out = outputs(lines)
        self.assertEqual(out["verdict"], "comment")
        self.assertNotEqual(out["blocking"], "0", "a count that is not digits holds the PR")
        self.assertRegex(out["blocking"], r"^[0-9]+$|^unknown$")
        self.assertNotRegex(out["decision"], r"[\r\n]")

    def test_a_clean_inherited_opinion_is_copied(self) -> None:
        done, lines = self.ws.run(
            INHERITED="true", INHERITED_VERDICT="approve", INHERITED_BLOCKING="0", INHERITED_DECISION="auto_merge: risco=low"
        )
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(outputs(lines), {"verdict": "approve", "blocking": "0", "decision": "auto_merge: risco=low"})


class InheritedCommentIsValidated(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.f = Fixture(Path(self.tmp.name))
        self.f.on_main()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def inherit(self, **fields: str) -> dict[str, str]:
        self.f.opinion(comment(self.f.reviewed, **fields))
        return self.f.run(self.f.merge_main())

    def test_an_unknown_verdict_in_the_comment_is_a_comment(self) -> None:
        """#51/AC-2: the app wrote the comment, and the step still takes only the three verdicts."""
        out = self.inherit(verdict="auto_merge_now")
        self.assertEqual(out["inherited"], "true")
        self.assertEqual(out["verdict"], "comment")

    def test_the_known_verdicts_carry_over(self) -> None:
        for verdict in ("approve", "request_changes", "comment"):
            self.f.comments.clear()
            self.assertEqual(self.inherit(verdict=verdict)["verdict"], verdict)

    def test_a_decision_with_control_characters_or_a_long_one_is_cut(self) -> None:
        """#51/AC-2: one line, no control character, at most 200 characters."""
        out = self.inherit(decision="hold_for_human: " + "x" * 400 + "\x07\x1b[31m")
        self.assertEqual(out["inherited"], "true")
        self.assertLessEqual(len(out["decision"]), 200)
        self.assertNotRegex(out["decision"], r"[\x00-\x1f\x7f`]")

    def test_the_inherit_script_writes_only_its_own_keys(self) -> None:
        out = self.inherit()
        self.assertEqual(set(out), {"inherited", "reviewed", "verdict", "decision", "blocking"})
        self.assertRegex(out["reviewed"], r"^[0-9a-f]{40}$")
        self.assertRegex(out["blocking"], r"^[0-9]+$")


if __name__ == "__main__":
    unittest.main()
