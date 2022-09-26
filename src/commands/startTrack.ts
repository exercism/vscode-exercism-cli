import got from 'got';
import * as vscode from 'vscode';

import { exec } from '../execute';

class TrackQuickPickItem implements vscode.QuickPickItem {
	constructor(
		public label: string,
		public description?: string | undefined,
		public detail?: string | undefined
	) {}
}

type TracksResponse = {
	tracks: { slug: string; title: string; tags: string[] }[];
};

export async function startTrackCommand(track: string | null | undefined) {
	if (!track) {
		const result = await vscode.window.withProgress<TracksResponse>(
			{
				location: vscode.ProgressLocation.Notification,
				cancellable: true,
				title: 'Loading tracks',
			},
			async (progress, token) => {
				const json = await got('https://exercism.org/api/v2/tracks', {
					headers: { accept: 'application/json' },
				}).json();

				if (token.isCancellationRequested) {
					throw new Error('Cancelled');
				}

				return json as TracksResponse;
			}
		);

		const picked = await vscode.window.showQuickPick<TrackQuickPickItem>(
			result.tracks.map(
				({ slug, title, tags }) => new TrackQuickPickItem(title, slug)
			),
			{
				title: 'Pick an Exercism track',
			}
		);

		track = picked?.description;
	}

	if (!track) {
		return;
	}

	const result = await vscode.window.withProgress<string>(
		{
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `Downloading exercise hello-world for ${track}`,
		},

		async (progress, token) => {
			const output = await exec(
				`exercism download --exercise hello-world --track ${track}`
			);

			if (token.isCancellationRequested) {
				throw new Error('Cancelled');
			}

			return output;
		}
	);

	const folderPath = result.trim();
	const folderPathParsed = folderPath.split(`\\`).join(`/`);
	const folderUri = vscode.Uri.file(folderPathParsed);

	return vscode.commands.executeCommand('vscode.openFolder', folderUri, {
		noRecentEntry: false,
	});
}
