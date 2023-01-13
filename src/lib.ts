import { spawn, SpawnOptions } from "child_process";

interface SpawnPromiseArgs {
  cmd: string;
  args: string[];
  options?: SpawnOptions;
  onStdOut?: (data: string) => void;
  onStdErr?: (data: string) => void;
}

export function spawnPromise({ cmd, args, options, onStdOut, onStdErr }: SpawnPromiseArgs) {
  return new Promise<string>((resolve, reject) => {
    const diffProcess = spawn(cmd, args, options);
    let stdo = "";
    let err = "";
    diffProcess.stdout.on("data", (d) => {
      const dataStr = d.toString();
      if (onStdOut) {
        onStdOut(dataStr);
      }
      stdo += dataStr;
    });

    diffProcess.stderr.on("data", (d) => {
      const dataStr = d.toString();
      if (onStdErr) {
        onStdErr(dataStr);
      }
      err += dataStr;
    });

    diffProcess.on("exit", (code) => {
      if (code === 0) {
        return resolve(stdo);
      }
      reject(err);
    });
  });
}
