"""The Argos reusable inherits its opinion when the head only merges the base.

Runs the inherit step of .github/workflows/argos.yml, read as text with the standard library
only, against a git fixture and a fake `gh` that answers the PR's comments. Needs bash, git
and jq on the PATH, as the runner has them.

    python3 -m unittest discover -s .github/scripts -v
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[1] / "workflows" / "argos.yml"
AUTHOR = "argos-by-ahrena[bot]"
LINES = "".join(f"line {n}\n" for n in range(1, 21))


def inherit_script() -> str:
    text = WORKFLOW.read_text(encoding="utf-8")
    step = text[text.index("        id: inherit\n") :]
    block = step[step.index("        run: |\n") + len("        run: |\n") :]
    lines = []
    for line in block.splitlines():
        if line and not line.startswith(" " * 10):
            break
        lines.append(line[10:])
    return "\n".join(lines) + "\n"


def comment(commit: str, verdict: str = "approve", decision: str = "auto_merge: risco=low") -> str:
    return (
        "<!-- ahrena-review -->\n## Ahrena · Code Review\n\n"
        f"**Verdict:** `{verdict}`  ·  **Decisor:** `{decision}`\n\n"
        "🔴 **0** bloqueantes · 🟡 **3** warnings\n\n"
        f"<sub>commit {commit} · modo comment</sub>\n"
    )


class Fixture:
    """A repository with main and a PR branch, and the comments the fake gh answers."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.repo = root / "repo"
        self.repo.mkdir()
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "test")
        self.write("app.py", LINES)
        self.write("other.txt", "other\n")
        self.commit("base")
        self.git("checkout", "-q", "-b", "pr")
        self.write("app.py", LINES.replace("line 15\n", "line 15 changed\n"))
        self.reviewed = self.commit("the PR's change")
        self.comments: list[dict[str, object]] = []
        self.editors: list[str] = []
        bin_dir = root / "bin"
        bin_dir.mkdir()
        gh = bin_dir / "gh"
        # The comments for the REST call, the comment's edits for the GraphQL one.
        gh.write_text(
            "#!/bin/sh\n"
            f'if [ "$2" = graphql ]; then cat "{root / "edits.json"}"; '
            f'else cat "{root / "comments.json"}"; fi\n'
        )
        gh.chmod(0o755)
        self.path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"

    def git(self, *args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=self.repo, check=True, capture_output=True, text=True
        ).stdout.strip()

    def write(self, name: str, content: str | bytes) -> None:
        path = self.repo / name
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content)

    def commit(self, message: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)
        return self.git("rev-parse", "HEAD")

    def on_main(self, change: str = "other.txt", content: str = "other changed\n") -> str:
        self.git("checkout", "-q", "main")
        self.write(change, content)
        sha = self.commit("main moves")
        self.git("checkout", "-q", "pr")
        return sha

    def merge_main(self) -> str:
        self.git("merge", "-q", "--no-edit", "main")
        return self.git("rev-parse", "HEAD")

    def opinion(self, body: str, author: str = AUTHOR) -> None:
        self.comments.append({"user": {"login": author}, "body": body, "node_id": "IC_1"})

    def run(self, head: str) -> dict[str, str]:
        (self.root / "comments.json").write_text(json.dumps([self.comments]))
        edits = [{"editor": {"login": login}} for login in self.editors]
        node = {"author": {"login": "argos-by-ahrena"}, "userContentEdits": {"nodes": edits}}
        (self.root / "edits.json").write_text(json.dumps([{"data": {"node": node}}]))
        output = self.root / "output"
        output.write_text("")
        env = {
            **os.environ,
            "PATH": self.path,
            "GH_TOKEN": "token",
            "REPO": "org/repo",
            "PR": "1",
            "AUTHOR": AUTHOR,
            "BASE": self.git("rev-parse", "main"),
            "HEAD": head,
            "GITHUB_OUTPUT": str(output),
        }
        subprocess.run(
            ["bash", "-e", "-c", inherit_script()],
            cwd=self.repo,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        return dict(line.split("=", 1) for line in output.read_text().splitlines())


class Inherit(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.f = Fixture(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_a_merge_of_the_base_inherits_the_opinion(self) -> None:
        """#39/AC-1: the reviewed head's verdict, Decisor and blocking count carry over."""
        self.f.opinion(comment(self.f.reviewed, decision="hold_for_human: 3 warnings"))
        self.f.on_main()
        out = self.f.run(self.f.merge_main())
        self.assertEqual(out["inherited"], "true")
        self.assertEqual(out["reviewed"], self.f.reviewed)
        self.assertEqual(out["verdict"], "approve")
        self.assertEqual(out["decision"], "hold_for_human: 3 warnings")
        self.assertEqual(out["blocking"], "0")

    def test_lines_the_base_moves_in_the_same_file_still_inherit(self) -> None:
        """#39/AC-1: line numbers do not count, the PR's own lines do."""
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main("app.py", "new first line\n" + LINES)
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "true")

    def test_two_merges_of_the_base_in_a_row_still_inherit(self) -> None:
        """#39/AC-1: the comment names the reviewed commit, and the cron may merge twice."""
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main()
        self.f.merge_main()
        self.f.on_main("third.txt", "third\n")
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "true")

    def test_an_edit_by_the_app_alone_still_inherits(self) -> None:
        """#39/AC-1: the app edits its comment on every review."""
        self.f.editors = ["argos-by-ahrena", "argos-by-ahrena"]
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main()
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "true")

    def test_a_comment_someone_else_edited_is_reviewed_again(self) -> None:
        """#39/AC-2: write access edits any comment, so a forged approve is not inherited."""
        self.f.editors = ["argos-by-ahrena", "someone"]
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main()
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "false")

    def test_a_hand_resolved_merge_with_the_same_patch_id_is_reviewed_again(self) -> None:
        """#39/AC-2: the same hunk moved elsewhere by the merge has the same patch-id."""
        block = "pad\npad\npad\n    check()\npad\npad\npad\n"
        self.f.git("checkout", "-q", "main")
        self.f.write("app.py", block + block)
        self.f.commit("two guarded blocks")
        self.f.git("checkout", "-q", "pr")
        self.f.git("reset", "-q", "--hard", "main")
        self.f.write("app.py", block.replace("    check()\n", "") + block)
        reviewed = self.f.commit("drop the first check")
        self.f.opinion(comment(reviewed))
        self.f.on_main()
        self.f.git("merge", "-q", "--no-commit", "main")
        self.f.write("app.py", block + block.replace("    check()\n", ""))
        self.f.git("add", "-A")
        self.f.git("commit", "-q", "--no-edit")
        self.assertEqual(self.f.run(self.f.git("rev-parse", "HEAD"))["inherited"], "false")

    def test_a_commit_that_is_not_a_merge_is_reviewed_again(self) -> None:
        """#39/AC-2: an amend or a rebase with the same diff is not a merge of the base."""
        self.f.opinion(comment(self.f.reviewed))
        self.f.git("commit", "-q", "--amend", "--no-edit", "--date", "2020-01-01T00:00:00")
        self.assertEqual(self.f.run(self.f.git("rev-parse", "HEAD"))["inherited"], "false")

    def test_a_new_change_after_the_review_is_reviewed_again(self) -> None:
        """#39/AC-2"""
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main()
        self.f.merge_main()
        self.f.write("other.txt", "slipped in with the merge\n")
        self.assertEqual(self.f.run(self.f.commit("more"))["inherited"], "false")

    def test_a_whitespace_change_in_the_pr_is_reviewed_again(self) -> None:
        """#39/AC-2: --verbatim, indentation is code."""
        self.f.opinion(comment(self.f.reviewed))
        self.f.write("app.py", LINES.replace("line 15\n", "    line 15 changed\n"))
        self.assertEqual(self.f.run(self.f.commit("indent"))["inherited"], "false")

    def test_a_binary_change_in_the_pr_is_reviewed_again(self) -> None:
        """#39/AC-2: --binary, a binary counts by its content."""
        self.f.write("blob.bin", b"\x00\x01\x02")
        reviewed = self.f.commit("binary")
        self.f.opinion(comment(reviewed))
        self.f.write("blob.bin", b"\x00\x01\x03")
        self.assertEqual(self.f.run(self.f.commit("binary again"))["inherited"], "false")

    def test_a_base_change_next_to_the_pr_lines_is_reviewed_again(self) -> None:
        """#39/AC-2: the base touches the PR's context, so the diff is not the same."""
        self.f.opinion(comment(self.f.reviewed))
        self.f.on_main("app.py", LINES.replace("line 18\n", "line 18 on main\n"))
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "false")

    def test_no_opinion_to_inherit_is_a_new_review(self) -> None:
        """#39/AC-2: no comment, someone else's comment, a header it cannot read, the same head."""
        self.f.on_main()
        head = self.f.merge_main()
        self.assertEqual(self.f.run(head)["inherited"], "false")
        self.f.opinion(comment(self.f.reviewed), author="someone")
        self.assertEqual(self.f.run(head)["inherited"], "false")
        self.f.opinion(
            f"<!-- ahrena-review -->\n**Argos** · verdict `approve`\n\n"
            f"<sub>commit {self.f.reviewed} · modo comment</sub>\n"
        )
        self.assertEqual(self.f.run(head)["inherited"], "false")
        self.f.opinion(comment(head))
        self.assertEqual(self.f.run(head)["inherited"], "false")

    def test_a_reviewed_commit_the_checkout_lacks_is_a_new_review(self) -> None:
        """#39/AC-2: a force push took the reviewed commit away."""
        self.f.opinion(comment("1" * 40))
        self.f.on_main()
        self.assertEqual(self.f.run(self.f.merge_main())["inherited"], "false")


class Workflow(unittest.TestCase):
    """#39/AC-1: an inherited opinion touches neither the comment nor the hold."""

    def setUp(self) -> None:
        self.text = WORKFLOW.read_text(encoding="utf-8")

    def step(self, name: str) -> str:
        start = self.text.index(f"      - name: {name}")
        end = self.text.find("\n      - name: ", start + 1)
        return self.text[start:end]

    def test_the_inherit_step_fails_open_to_a_review(self) -> None:
        self.assertIn("continue-on-error: true", self.step("o parecer herdado"))

    def test_the_review_copies_the_inherited_opinion(self) -> None:
        argos = self.step("o Argos lê o PR")
        self.assertRegex(argos, re.escape('if [ "$INHERITED" = true ]; then'))
        self.assertLess(argos.index("INHERITED_VERDICT"), argos.index("docker run"))

    def test_the_comment_and_the_hold_stay_as_they_are(self) -> None:
        guard = "steps.inherit.outputs.inherited != 'true'"
        self.assertIn(guard, self.step("o parecer, no PR"))
        self.assertIn(guard, self.step("o argos:hold"))
        self.assertIn(guard, self.step("o merge, quando"))

    def test_only_the_app_comment_is_inherited(self) -> None:
        """#39/AC-2: github-actions[bot] is any workflow of the repo."""
        self.assertIn("if: steps.app.outputs.app-slug != ''", self.step("o parecer herdado"))

    def test_the_summary_reads_the_opinion_from_the_environment(self) -> None:
        """#39/AC-2: the decision comes from a comment, so it never enters the script."""
        self.assertNotIn("${{ steps.argos.outputs", self.step("o resumo").split("run: |")[1])


if __name__ == "__main__":
    unittest.main()
