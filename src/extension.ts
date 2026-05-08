import * as vscode from 'vscode';
import { getConfig, validateConfig } from './config';
import { syncFile } from './rsync';
import { SyncStatusBar } from './statusBar';

export function activate(context: vscode.ExtensionContext) {
	console.log('=== rsyncvsc extension activated ===');
	vscode.window.showInformationMessage('rsyncvsc extension activated');

	const statusBar = new SyncStatusBar();
	const outputChannel = vscode.window.createOutputChannel('rsyncvsc');

	// manual sync command
	const syncCommand = vscode.commands.registerCommand(
		'rsyncvsc.syncFile',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }
			await doSync(editor.document, statusBar, outputChannel);
		}
	);

	// sync on save
	const onSave = vscode.workspace.onDidSaveTextDocument(async (doc) => {
		const config = getConfig();
		if (!config.enabled) { return; }
		await doSync(doc, statusBar, outputChannel);
	});

	context.subscriptions.push(statusBar, syncCommand, onSave, outputChannel);
}

async function doSync(
	doc: vscode.TextDocument,
	statusBar: SyncStatusBar,
	output: vscode.OutputChannel
) {
	const config = getConfig();
	const validationError = validateConfig(config);

	if (validationError) {
		vscode.window.showErrorMessage(validationError);
		return;
	}

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if (!workspaceRoot) { return; }

	const fileName = doc.uri.fsPath;
	statusBar.syncing(fileName);
	output.appendLine(`[${new Date().toISOString()}] Syncing ${fileName}...`);

	const result = await syncFile(fileName, workspaceRoot, config);

	if (result.success) {
		statusBar.success(fileName);
		output.appendLine(`✓ Done\n${result.output}`);
	} else {
		statusBar.error(result.error ?? 'Unknown error');
		output.appendLine(`✗ Failed: ${result.error}`);
		output.show(); // pop open the output panel on error
		vscode.window.showErrorMessage(`rsync failed: ${result.error}`);
	}
}

export function deactivate() { }
