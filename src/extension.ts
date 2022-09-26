// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { configureCommand } from './commands/configure';
import { installCommand } from './commands/install';
import { startTrackCommand } from './commands/startTrack';
import { submitCommand } from './commands/submit';
import { upgradeCommand } from './commands/upgrade';
import { versionCommand } from './commands/version';
import { workspaceCommand } from './commands/workspace';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.install', installCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.version', versionCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.upgrade', upgradeCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.configure', configureCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.workspace', workspaceCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.startTrack', startTrackCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('exercism.submitSolution', submitCommand)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
