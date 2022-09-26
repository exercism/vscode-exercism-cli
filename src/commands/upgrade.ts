import * as vscode from 'vscode';

import { exec } from '../execute';

export async function upgradeCommand() {
	const output = await exec('exercism upgrade');
	const match = output.match(/Your CLI version is up to date./);

	if (!match) {
		return vscode.window.showInformationMessage(
			`The following message was returned by the CLI: ${output}`
		);
	}

	return vscode.window.showInformationMessage(output);
}
