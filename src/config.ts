import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export interface RsyncConfig {
    enabled: boolean;
    remotePath: string;
    privateKeyPath: string;
    extraArgs: string[];
}

export function getConfig(): RsyncConfig {
    const config = vscode.workspace.getConfiguration('rsyncvsc');
    return {
        enabled: config.get<boolean>('enabled', false) || false,
        remotePath: config.get<string>('remotePath', '') || '',
        privateKeyPath: config.get<string>('privateKeyPath', '')
            .replace('~', os.homedir()),
        extraArgs: config.get<string[]>('extraArgs', []) || [],
    }
}

export function validateConfig(config: RsyncConfig): string | null {
    if (!config.remotePath) {
        return 'rsyncvsc.remotePath is not configured. Please set it in the settings.';
    }
    if (!config.privateKeyPath) {
        return 'rsyncvsc.privateKeyPath is not configured. Please set it in the settings.';
    }
    return null;
}
