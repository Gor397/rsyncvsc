# rsyncvsc

Automatically sync your VS Code workspace to a remote server using `rsync` over SSH — on save or on demand.

## Features

- **Sync on save** — workspace is synced to the remote every time you save a file
- **Manual sync** — run `rsync: Sync Workspace` from the command palette anytime
- **Config file per project** — settings live in `.rsyncvscconfig` at the workspace root, not in VS Code settings
- **Exclude support** — ignore files via an exclude file or inline patterns in the config
- **SSH agent support** — works with `ssh-agent` so no key path is required if your key is already loaded
- **Status bar indicator** — shows sync state (idle, syncing, success, error) at a glance

## Requirements

- `rsync` must be installed and available in `PATH`
- SSH access to the remote server (either via key or `ssh-agent`)

## Setup

**1. Create `.rsyncvscconfig` in your workspace root**

The extension only activates when this file is present. Create it with at minimum:

```json
{
    "enabled": true,
    "remoteHost": "user@192.168.1.100",
    "remotePath": "/var/www/myproject",
    "extraArgs": ["-avz", "--delete"]
}
```

**2. Set up SSH authentication**

You have two options:

**Option A — SSH key (explicit)**

Generate a key pair and copy the public key to the remote server:

```bash
ssh-keygen -t rsa -b 4096
ssh-copy-id user@192.168.1.100
```

Then add the key path to your config:

```json
{
    "privateKeyPath": "~/.ssh/id_rsa"
}
```

**Option B — ssh-agent (no key path needed)**

If your key is already loaded in `ssh-agent`, just omit `privateKeyPath` entirely. The extension will authenticate through the agent automatically.

```bash
ssh-add ~/.ssh/id_rsa   # run once; macOS/Windows load keys automatically on login
```

## Configuration

All configuration lives in `.rsyncvscconfig` at the workspace root. The file supports `//` comments.

| Field | Type | Required | Description |
|---|---|---|---|
| `enabled` | boolean | yes | Set to `true` to enable sync on save |
| `remoteHost` | string | yes | Remote host in `user@host` format |
| `remotePath` | string | yes | Absolute path on the remote to sync into |
| `extraArgs` | string[] | no | Extra arguments passed to rsync (default: `["-avz", "--delete"]`) |
| `privateKeyPath` | string | no | Path to SSH private key. Omit to use `ssh-agent` |
| `rsyncIgnoreFile` | string | no | Path to an exclude file (one pattern per line). Takes precedence over `rsyncIgnorePatterns` |
| `rsyncIgnorePatterns` | string[] | no | Inline list of exclude patterns. Used only when `rsyncIgnoreFile` is not set |

### Path formats

All path fields (`privateKeyPath`, `rsyncIgnoreFile`) accept:

- **Relative** — resolved against the workspace root: `".rsyncignore"`
- **Tilde** — expanded to home directory: `"~/.ssh/id_rsa"`
- **Absolute** — used as-is: `"/home/user/.ssh/id_rsa"`

### Full example

```json
{
    "enabled": true,
    "remoteHost": "user@192.168.1.100",
    "remotePath": "/var/www/myproject",
    "privateKeyPath": "~/.ssh/id_rsa",
    "extraArgs": ["-avz", "--delete"],

    // Option A: point to an ignore file
    "rsyncIgnoreFile": ".rsyncignore",

    // Option B: inline patterns (used only if rsyncIgnoreFile is not set)
    "rsyncIgnorePatterns": [
        "node_modules",
        ".git",
        "dist",
        "*.log",
        ".env",
        ".DS_Store"
    ]
}
```

## Commands

| Command | Description |
|---|---|
| `rsync: Sync Workspace` | Manually trigger a full workspace sync |

## Known Issues

- Sync runs on every file save. There is no debounce for rapid successive saves.
- Password-based SSH authentication is not supported. Use an SSH key or `ssh-agent`.

## Release Notes

### 0.0.1

Initial release.