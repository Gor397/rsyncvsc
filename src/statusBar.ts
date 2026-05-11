import * as vscode from 'vscode';

export class SyncStatusBar {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 100
        );
        this.item.command = 'rsyncvsc.syncWorkspace';
        this.item.show();
        this.idle();
    }

    idle() {
        this.item.text = '$(cloud) rsync';
        this.item.tooltip = 'rsyncvsc: idle — click to sync';
        this.item.color = undefined;
    }

    noConfig() {
        this.item.text = '$(cloud) rsync';
        this.item.tooltip = `rsyncvsc: no .rsyncvscconfig found — sync disabled`;
        this.item.color = new vscode.ThemeColor('editorWarning.foreground');
    }

    syncing(label: string) {
        this.item.text = '$(sync~spin) syncing...';
        this.item.tooltip = `Syncing ${label}`;
        this.item.color = undefined;
    }

    success(label: string) {
        this.item.text = '$(check) synced';
        this.item.tooltip = `Successfully synced ${label}`;
        this.item.color = new vscode.ThemeColor('terminal.ansiGreen');
        setTimeout(() => this.idle(), 3000);
    }

    error(message: string) {
        this.item.text = '$(error) sync failed';
        this.item.tooltip = message;
        this.item.color = new vscode.ThemeColor('terminal.ansiRed');
    }

    dispose() {
        this.item.dispose();
    }
}
