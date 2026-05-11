import * as vscode from 'vscode';
import { loadConfig, validateConfig, CONFIG_FILENAME } from './config';
import { syncWorkspace } from './rsync';
import { SyncStatusBar } from './statusBar';

export function activate(context: vscode.ExtensionContext) {
	console.log('=== rsyncvsc extension activated ===');

	const statusBar = new SyncStatusBar();
	const outputChannel = vscode.window.createOutputChannel('rsyncvsc');

	// Manual sync command
	const syncCommand = vscode.commands.registerCommand(
		'rsyncvsc.syncWorkspace',
		async () => {
			await doSync(statusBar, outputChannel);
		}
	);

	// Sync on save
	const onSave = vscode.workspace.onDidSaveTextDocument(async (doc) => {
		// Skip syncing the config file itself to avoid loops
		if (doc.uri.fsPath.endsWith(CONFIG_FILENAME)) { return; }

		const { config } = loadConfig();
		if (!config?.enabled) { return; }

		await doSync(statusBar, outputChannel);
	});

	// Watch for .rsyncvscconfig being created / deleted so the status bar
	// reflects availability without requiring a restart.
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
	if (workspaceRoot) {
		const watcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(workspaceRoot, CONFIG_FILENAME)
		);
		watcher.onDidCreate(() => statusBar.idle());
		watcher.onDidDelete(() => statusBar.noConfig());
		context.subscriptions.push(watcher);
	}

	context.subscriptions.push(statusBar, syncCommand, onSave, outputChannel);

	// Reflect initial state
	const { found, error: initError } = loadConfig();
	if (!found && !initError) { statusBar.noConfig(); }
}

async function doSync(
	statusBar: SyncStatusBar,
	output: vscode.OutputChannel
) {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) { return; }

	const { config, found, error: loadError } = loadConfig();

	// .rsyncvscconfig absent → silently do nothing
	if (!found && !loadError) { return; }

	// File exists but couldn't be read or parsed → surface the error
	if (loadError || !config) {
		vscode.window.showErrorMessage(`rsyncvsc: ${loadError ?? 'Failed to load config'}`);
		return;
	}

	if (!config.enabled) { return; }

	const validationError = validateConfig(config);
	if (validationError) {
		vscode.window.showErrorMessage(`rsyncvsc: ${validationError}`);
		return;
	}

	statusBar.syncing(workspaceRoot);
	output.appendLine(`[${new Date().toISOString()}] Syncing workspace: ${workspaceRoot}`);
	output.appendLine(`  → ${config.remoteHost}:${config.remotePath}`);

	const result = await syncWorkspace(workspaceRoot, config);

	if (result.success) {
		statusBar.success(workspaceRoot);
		output.appendLine(`✓ Done\n${result.output}`);
	} else {
		statusBar.error(result.error ?? 'Unknown error');
		output.appendLine(`✗ Failed: ${result.error}`);
		output.show();
		vscode.window.showErrorMessage(`rsync failed: ${result.error}`);
	}
}

export function deactivate() { }
