import * as semver from 'semver';
import * as vscode from 'vscode';

import { exec, execSafe } from '../execute';

export const INSTALLED = Object.freeze(Object.create(null));

export async function installCommand(): Promise<
	boolean | undefined | typeof INSTALLED
> {
	const output = await execSafe('exercism version');
	const match = output.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);

	if (!match) {
		vscode.env.openExternal(
			vscode.Uri.parse('https://exercism.org/cli-walkthrough')
		);
		return;
	}

	const version = match[1];

	const parsed = semver.parse(version);
	if (!parsed || parsed.major < 3) {
		const result = await vscode.window.showWarningMessage(
			`
          Found the Exercism CLI (version: ${version}}), but this extension
          expects version >= 3, < 4.
        `.trim(),
			'Attempt to upgrade',
			'Ignore'
		);

		if (result === 'Attempt to upgrade') {
			await exec('exercism upgrade');
			// version = await exec("exercism version");
			// match = version.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);
		}
		return INSTALLED;
	}

	if (parsed.major > 3) {
		vscode.window.showWarningMessage(
			`
        Found the Exercism CLI (version: ${version}), but this extension
        expects version >= 3, < 4. The extension has not (yet) been tested
        against your installed version. If you run into issues, please report
        them at https://github.com/exercism/exercism.
      `.trim()
		);
	} else {
		vscode.window.showInformationMessage(
			`Found the Exercism CLI (version: ${version}).`
		);
	}

	return INSTALLED;
}
