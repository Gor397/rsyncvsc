import { execFile } from 'child_process';
import * as path from 'path';
import { RsyncConfig } from './config';

export interface SyncResult {
    success: boolean;
    output: string;
    error?: string;
}

function buildArgs(workspaceRoot: string, config: RsyncConfig): string[] {
    // Trailing slash on source tells rsync to sync the *contents* of the
    // workspace directory into remotePath, preserving the tree structure.
    const localSource = workspaceRoot.endsWith('/') ? workspaceRoot : `${workspaceRoot}/`;
    const remoteTarget = `${config.remoteHost}:${config.remotePath}`;

    const args: string[] = [
        ...config.extraArgs,
        '-e', `ssh -i ${config.privateKeyPath} -o StrictHostKeyChecking=no`,
    ];

    // Exclude / filter rules — ignore file wins over inline patterns
    if (config.rsyncIgnoreFile) {
        // --exclude-from treats each line as an exclude pattern
        args.push('--exclude-from', config.rsyncIgnoreFile);
    } else if (config.rsyncIgnorePatterns && config.rsyncIgnorePatterns.length > 0) {
        for (const pattern of config.rsyncIgnorePatterns) {
            args.push('--exclude', pattern);
        }
    }

    args.push(localSource, remoteTarget);
    return args;
}

export function syncWorkspace(
    workspaceRoot: string,
    config: RsyncConfig
): Promise<SyncResult> {
    return new Promise((resolve) => {
        const args = buildArgs(workspaceRoot, config);

        execFile('rsync', args, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    success: false,
                    output: stdout,
                    error: stderr || error.message,
                });
            } else {
                resolve({ success: true, output: stdout });
            }
        });
    });
}