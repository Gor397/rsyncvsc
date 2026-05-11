import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export const CONFIG_FILENAME = '.rsyncvscconfig';

export interface RsyncConfig {
    enabled: boolean;
    remoteHost: string;
    remotePath: string;
    privateKeyPath: string;
    extraArgs: string[];
    /**
     * Path to an rsync filter/exclude file (like .rsyncignore or .gitignore).
     * Passed to rsync via --exclude-from. Takes precedence over rsyncIgnorePatterns
     * if both are set.
     */
    rsyncIgnoreFile?: string;
    /**
     * Inline list of patterns to exclude (e.g. ["node_modules", "*.log", ".git"]).
     * Used only when rsyncIgnoreFile is not set.
     */
    rsyncIgnorePatterns?: string[];
}

export interface ConfigResult {
    config: RsyncConfig | null;
    /** Absolute path to the config file, whether or not it exists */
    configFilePath: string;
    /** True if the .rsyncvscconfig file exists on disk (even if it failed to parse) */
    found: boolean;
    /** Error message when the file exists but could not be read or parsed */
    error?: string;
}

/**
 * Resolves a file path written in the config:
 *   ~-prefixed  → expanded to home directory
 *   absolute    → used as-is
 *   relative    → resolved against the workspace root
 */
function resolveFilePath(filePath: string, workspaceRoot: string): string {
    if (filePath.startsWith('~')) {
        return filePath.replace(/^~/, os.homedir());
    }
    if (path.isAbsolute(filePath)) {
        return filePath;
    }
    return path.join(workspaceRoot, filePath);
}

export function loadConfig(): ConfigResult {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        return { config: null, configFilePath: '', found: false, error: 'No workspace open' };
    }

    const configFilePath = path.join(workspaceRoot, CONFIG_FILENAME);

    if (!fs.existsSync(configFilePath)) {
        return { config: null, configFilePath, found: false };
    }

    let raw: string;
    try {
        raw = fs.readFileSync(configFilePath, 'utf8');
    } catch (e: any) {
        return { config: null, configFilePath, found: true, error: `Cannot read ${CONFIG_FILENAME}: ${e.message}` };
    }

    // Strip single-line // comments so the config file can be annotated freely.
    const stripped = raw.replace(/\/\/.*$/gm, '');

    let parsed: any;
    try {
        parsed = JSON.parse(stripped);
    } catch (e: any) {
        return { config: null, configFilePath, found: true, error: `Invalid JSON in ${CONFIG_FILENAME}: ${e.message}` };
    }

    const config: RsyncConfig = {
        enabled: parsed.enabled === true,
        remoteHost: parsed.remoteHost ?? '',
        remotePath: parsed.remotePath ?? '',
        privateKeyPath: resolveFilePath(parsed.privateKeyPath ?? '', workspaceRoot),
        extraArgs: Array.isArray(parsed.extraArgs) ? parsed.extraArgs : [],
        rsyncIgnoreFile: parsed.rsyncIgnoreFile
            ? resolveFilePath(parsed.rsyncIgnoreFile as string, workspaceRoot)
            : undefined,
        rsyncIgnorePatterns: Array.isArray(parsed.rsyncIgnorePatterns)
            ? parsed.rsyncIgnorePatterns
            : undefined,
    };

    return { config, configFilePath, found: true };
}

export function validateConfig(config: RsyncConfig): string | null {
    if (!config.remoteHost) {
        return `"remoteHost" is missing in ${CONFIG_FILENAME}.`;
    }
    if (!config.remotePath) {
        return `"remotePath" is missing in ${CONFIG_FILENAME}.`;
    }
    if (!config.privateKeyPath) {
        return `"privateKeyPath" is missing in ${CONFIG_FILENAME}.`;
    }
    if (config.rsyncIgnoreFile && !fs.existsSync(config.rsyncIgnoreFile)) {
        return `rsyncIgnoreFile "${config.rsyncIgnoreFile}" does not exist.`;
    }
    return null;
}
