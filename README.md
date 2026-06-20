# GoodFinds 2.0

Public project repository for Good Finds 2.0.

**Remote:** https://github.com/Jolien-Product-Manager/GoodFinds2.0

## Committing with change details

Use the `commit` command to create commits that include a structured summary of what changed:

```bash
./commit "Your short commit title"
```

Or with npm:

```bash
npm run commit -- "Your short commit title"
```

### What it does

1. Shows your current changes (staged and unstaged)
2. Prompts you to stage files (all, pick files, or use already-staged only)
3. Opens your editor so you can add an optional longer description
4. Appends an auto-generated **Changes** section listing every modified file and line counts
5. Commits and optionally pushes to GitHub

### Options

```bash
./commit "Fix login bug"              # commit with title only
./commit "Fix login bug" --push       # commit and push to origin
./commit "Fix login bug" --all        # stage all tracked changes before committing
./commit --push --all "Update UI"     # stage all, commit, and push
```

### Push to GitHub

After committing:

```bash
git push
```

Or use `--push` on the commit command to push in one step.
