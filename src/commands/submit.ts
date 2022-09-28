import * as vscode from 'vscode';

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { exec } from '../execute';

export async function submitCommand() {
	if (!vscode.window.activeTextEditor) {
		return vscode.window.showInformationMessage(
			'Open any file in your solution and try again'
		);
	}

	const parts = vscode.window.activeTextEditor?.document.uri.path.split('/');
	const index = [parts.indexOf('Exercism'), parts.indexOf('exercism')];

	if (index.every((i) => i === -1)) {
		const activePath = vscode.window.activeTextEditor?.document.uri.path;
		return vscode.window.showWarningMessage(
			`The active document path is ${activePath}. This command only
	  works if the path contains a folder called Exercism. At this moment it is
	  not yet possible to use this features with a workspace location without that
	  folder present.`
		);
	}

	const exercisePath = vscode.Uri.parse(
		parts.slice(0, index.find((i) => i !== -1)! + 3).join('/')
	);
	const configPath = vscode.Uri.parse(
		[exercisePath.path, '.exercism', 'config.json'].join('/')
	);

	if (!existsSync(configPath.fsPath)) {
		return vscode.window.showWarningMessage(
			`Cannot submit this solution automatically, because .exercism/config.json
          could not be found at ${configPath.fsPath}. This may happen if you are
          trying to submit someone else their solution.`
		);
	}

	return vscode.window
		.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				cancellable: false,
				title: 'Submitting...',
			},
			() =>
				readFile(configPath.fsPath)
					.then((buffer) => buffer.toString())
					.then((string) => JSON.parse(string))
					.then((result) =>
						exec(
							`exercism submit ${result.files.solution
								.map(
									(file: string) =>
										vscode.Uri.parse([exercisePath.path, file].join('/')).fsPath
								)
								.join(' ')}`
						)
					)
					.catch((error) => {
						vscode.window.showErrorMessage(error.message, { modal: false });
						return null;
					})
		)
		.then(async (url) => {
			if (!url) {
				return;
			}

			const output = await vscode.window.showInformationMessage(
				'Successfully submitted your solution.',
				'See it online'
			);
			if (!output) {
				return;
			}

			vscode.env.openExternal(vscode.Uri.parse(url.trim()));
		});
}
