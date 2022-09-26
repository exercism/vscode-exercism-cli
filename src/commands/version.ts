import * as vscode from 'vscode';

import { execSafe } from '../execute';

export async function versionCommand() {
	const output = await execSafe('exercism version');
	const match = output.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);

	if (!match) {
		const result = await vscode.window.showErrorMessage(
			'Could not determine the installed CLI version. Perhaps it is not installed?',
			'Show installation instructions'
		);
		if (!result) {
			return;
		}

		await vscode.env.openExternal(
			vscode.Uri.parse('https://exercism.org/cli-walkthrough')
		);
		return;
	}

	const version = match[1];
	vscode.window.showInformationMessage(
		`Found the Exercism CLI (version: ${version})`
	);

	vscode.workspace.getConfiguration('exercism').update('found', true);
}
