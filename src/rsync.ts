import { execFile } from 'child_process';
import * as path from 'path';
import { RsyncConfig } from './config';

export interface SyncResult {
    success: boolean;
    output: string;
    error?: string;
}

function buildArgs(
    localFile: string,
    workspaceRoot: string,
    config: RsyncConfig
): string[] {
    // preserve relative path structure on remote
    // e.g. local:  /workspace/src/foo.ts
    // remote:      user@host:/var/www/project/src/foo.ts
    const relativePath = path.relative(workspaceRoot, localFile);
    const remoteTarget = `${config.remotePath}/${relativePath}`;

    return [
        ...config.extraArgs,
        '-e', `ssh -i ${config.privateKeyPath} -o StrictHostKeyChecking=no`,
        localFile,
        remoteTarget,
    ];
}

export function syncFile(
    localFile: string,
    workspaceRoot: string,
    config: RsyncConfig
): Promise<SyncResult> {
    return new Promise((resolve) => {
        const args = buildArgs(localFile, workspaceRoot, config);

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
