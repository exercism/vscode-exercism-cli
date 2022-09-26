import * as vscode from 'vscode';

import { exec, execSafe } from '../execute';

export async function configureCommand() {
	const output = await execSafe('exercism configure');
	const required = output.match(/Error: There is no token configured./);

	if (!required) {
		const result = await vscode.window.showInformationMessage(
			'Your CLI is already configured. Do you want to re-configure it?',
			'No, leave as is',
			'Yes, change token',
			'Yes, change workspace'
		);

		if (!result || result === 'No, leave as is') {
			return;
		}

		if (result === 'Yes, change workspace') {
			const workspace = await vscode.window.showInputBox({
				title: 'New workspace path',
			});

			if (!workspace) {
				return;
			}

			const output = await exec(`exercism configure --workspace=${workspace}`);
			if (output !== '') {
				vscode.window.showWarningMessage(
					`Unexpected message returned: ${output}`
				);
			}

			return vscode.commands.executeCommand('exercism.workspace');
		}
	}

	const result = await vscode.window.showInformationMessage(
		'Open your settings page on exercism.io and copy the CLI token, then re-run this command.',
		'Open settings page',
		'Enter CLI token'
	);

	if (!result) {
		return;
	}

	if (result === 'Open settings page') {
		return vscode.env.openExternal(
			vscode.Uri.parse('https://exercism.org/settings/api_cli')
		);
	}

	if (result === 'Enter CLI token') {
		const token = await vscode.window.showInputBox({
			title: 'Exercism CLI token',
			validateInput: (value) =>
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
					value
				)
					? ''
					: 'That is not a valid token',
		});

		if (!token) {
			return;
		}

		const output = await exec(`exercism configure --token=${token}`);
		if (output !== '') {
			vscode.window.showWarningMessage(
				`Unexpected message returned: ${output}`
			);
		}
	}

	return vscode.workspace
		.getConfiguration('exercism')
		.update('configured', true);
}
