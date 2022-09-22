// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { exec, execSafe } from "./execute";
import * as semver from "semver";
import got from "got";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.install", async () => {
      const output = await execSafe("exercism version");
      const match = output.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);

      if (!match) {
        vscode.env.openExternal(
          vscode.Uri.parse("https://exercism.org/cli-walkthrough")
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
          "Attempt to upgrade",
          "Ignore"
        );

        if (result === "Attempt to upgrade") {
          await exec("exercism upgrade");
          // version = await exec("exercism version");
          // match = version.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);
        }
        return;
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

      vscode.workspace.getConfiguration("exercism").update("found", true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.version", async () => {
      const output = await execSafe("exercism version");
      const match = output.match(/exercism version ((?:[0-9]+\.)+[0-9]+)/);

      if (!match) {
        const result = await vscode.window.showErrorMessage(
          "Could not determine the installed CLI version. Perhaps it is not installed?",
          "Show installation instructions"
        );
        if (!result) {
          return;
        }

        await vscode.env.openExternal(
          vscode.Uri.parse("https://exercism.org/cli-walkthrough")
        );
        return;
      }

      const version = match[1];
      vscode.window.showInformationMessage(
        `Found the Exercism CLI (version: ${version})`
      );

      vscode.workspace.getConfiguration("exercism").update("found", true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.upgrade", async () => {
      const output = await exec("exercism upgrade");
      const match = output.match(/Your CLI version is up to date./);

      if (!match) {
        return vscode.window.showInformationMessage(
          `The following message was returned by the CLI: ${output}`
        );
      }

      return vscode.window.showInformationMessage(output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.configure", async () => {
      const output = await execSafe("exercism configure");
      const required = output.match(/Error: There is no token configured./);

      if (!required) {
        const result = await vscode.window.showInformationMessage(
          "Your CLI is already configured. Do you want to re-configure it?",
          "No, leave as is",
          "Yes, change token",
          "Yes, change workspace"
        );

        if (!result || result === "No, leave as is") {
          return;
        }

        if (result === "Yes, change workspace") {
          const workspace = await vscode.window.showInputBox({
            title: "New workspace path",
          });

          if (!workspace) {
            return;
          }

          const output = await exec(
            `exercism configure --workspace=${workspace}`
          );
          if (output !== "") {
            vscode.window.showWarningMessage(
              `Unexpected message returned: ${output}`
            );
          }

          return vscode.commands.executeCommand("exercism.workspace");
        }
      }

      const result = await vscode.window.showInformationMessage(
        "Open your settings page on exercism.io and copy the CLI token, then re-run this command.",
        "Open settings page",
        "Enter CLI token"
      );

      if (!result) {
        return;
      }

      if (result === "Open settings page") {
        return vscode.env.openExternal(
          vscode.Uri.parse("https://exercism.org/settings/api_cli")
        );
      }

      if (result === "Enter CLI token") {
        const token = await vscode.window.showInputBox({
          title: "Exercism CLI token",
          validateInput: (value) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
              value
            )
              ? ""
              : "That is not a valid token",
        });

        if (!token) {
          return;
        }

        const output = await exec(`exercism configure --token=${token}`);
        if (output !== "") {
          vscode.window.showWarningMessage(
            `Unexpected message returned: ${output}`
          );
        }
      }

      return vscode.workspace
        .getConfiguration("exercism")
        .update("configured", true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.workspace", async () => {
      const output = await exec("exercism workspace").catch(() => "");

      if (!output) {
        const command = await vscode.window.showErrorMessage(
          "The Exercism CLI does not seem to be configured.",
          "Install CLI",
          "Configure CLI",
          "Close"
        );

        switch (command) {
          case "Install CLI": {
            return vscode.commands.executeCommand("exercism.install");
          }

          case "Configure CLI": {
            return vscode.commands.executeCommand("exercism.configure");
          }
        }

        return;
      }

      const folderPath = output.trim();
      const folderPathParsed = folderPath.split(`\\`).join(`/`);
      const folderUri = vscode.Uri.file(folderPathParsed);

      return vscode.commands.executeCommand("vscode.openFolder", folderUri, {
        noRecentEntry: false,
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.startTrack", async (track) => {
      if (!track) {
        const result = await vscode.window.withProgress<TracksResponse>(
          {
            location: vscode.ProgressLocation.Notification,
            cancellable: true,
            title: "Loading tracks",
          },
          async (progress, token) => {
            const json = await got("https://exercism.org/api/v2/tracks", {
              headers: { accept: "application/json" },
            }).json();

            if (token.isCancellationRequested) {
              throw new Error("Cancelled");
            }

            return json as TracksResponse;
          }
        );

        const picked = await vscode.window.showQuickPick<TrackQuickPickItem>(
          result.tracks.map(
            ({ slug, title, tags }) => new TrackQuickPickItem(title, slug)
          ),
          {
            title: "Pick an Exercism track",
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
            throw new Error("Cancelled");
          }

          return output;
        }
      );

      const folderPath = result.trim();
      const folderPathParsed = folderPath.split(`\\`).join(`/`);
      const folderUri = vscode.Uri.file(folderPathParsed);

      return vscode.commands.executeCommand("vscode.openFolder", folderUri, {
        noRecentEntry: false,
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("exercism.submitSolution", async () => {
      if (!vscode.window.activeTextEditor) {
        return vscode.window.showInformationMessage(
          "Open any file in your solution and try again"
        );
      }

      const parts =
        vscode.window.activeTextEditor?.document.uri.path.split("/");

      const exercisePath = vscode.Uri.parse(
        parts.slice(0, parts.indexOf("Exercism") + 3).join("/")
      );
      const configPath = vscode.Uri.parse(
        [exercisePath.path, ".exercism", "config.json"].join("/")
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
            title: "Submitting...",
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
                        vscode.Uri.parse([exercisePath.path, file].join("/"))
                          .fsPath
                    )
                    .join(" ")}`
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
            "Successfully submitted your solution.",
            "See it online"
          );
          if (!output) {
            return;
          }

          vscode.env.openExternal(vscode.Uri.parse(url.trim()));
        });
    })
  );
}

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

// this method is called when your extension is deactivated
export function deactivate() {}
