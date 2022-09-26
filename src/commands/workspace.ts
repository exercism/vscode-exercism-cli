import * as vscode from 'vscode';

import { exec } from '../execute';

export async function workspaceCommand() {
	const output = await exec('exercism workspace').catch(() => '');

	if (!output) {
		const command = await vscode.window.showErrorMessage(
			'The Exercism CLI does not seem to be configured.',
			'Install CLI',
			'Configure CLI',
			'Close'
		);

		switch (command) {
			case 'Install CLI': {
				return vscode.commands.executeCommand('exercism.install');
			}

			case 'Configure CLI': {
				return vscode.commands.executeCommand('exercism.configure');
			}
		}

		return;
	}

	const folderPath = output.trim();
	const folderPathParsed = folderPath.split(`\\`).join(`/`);
	const folderUri = vscode.Uri.file(folderPathParsed);

	return vscode.commands.executeCommand('vscode.openFolder', folderUri, {
		noRecentEntry: false,
	});
}
