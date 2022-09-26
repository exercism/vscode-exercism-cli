import { exec as childProcessExec } from 'child_process';

export function exec(
	cmd: string,
	logError = console.error,
	logVerbose = console.debug
) {
	logVerbose(`[exec] ${cmd}`);

	return new Promise<string>((resolve, reject) => {
		childProcessExec(cmd, (err, out) => {
			if (err) {
				logError(`[exec] error while running ${cmd}`);
				logError(err);

				return reject(err);
			}
			logVerbose(`[exec] out for ${cmd}`, out);

			return resolve(out);
		});
	});
}

export function execSafe(cmd: string) {
	return exec(cmd, console.debug).catch((error) => error.message);
}
