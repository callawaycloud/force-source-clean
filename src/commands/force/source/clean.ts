import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import ignore, { Ignore } from 'ignore';
import * as path from 'path';
import * as copy from 'recursive-copy';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('force-source-clean', 'clean');

const FILE_MARKER_CONTENTS = '[DELETE]';

export default class Org extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ sfdx force:source:clean -x manifest/package.xml',
    '$ sfdx force:source:clean -x manifest/package.xml --noprompt'
  ];

  protected static flagsConfig = {
    manifest: flags.string({ char: 'x', description: messages.getMessage('manifestFlagDescription'), default: path.join('manifest', 'package.xml') }),
    noprompt: flags.boolean({ char: 'n', description: messages.getMessage('noPromptFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    const connection = this.org.getConnection();
    const targetUser = connection.getUsername();
    const sourcePaths = ((await this.project.resolveProjectConfig())['packageDirectories'] as any[]).map(d => d.path);

    if (!this.flags.noprompt) {
      this.ux.warn(
        `${chalk.default.bold.red('This command can be dangerous!')} It is intended to be used along side source control.  IT WILL REMOVE ALL FILES FROM ${chalk.default.red(sourcePaths.map(p => path.join(this.project.getPath(), p)).join(' & '))} WHICH ARE NOT FOUND IN THE TARGET ORG (${targetUser}).  They will not be recoverable unless tracked in source control!`
      );
      const confirm = await this.ux.prompt('Do you wish to continue? (y)');
      if (confirm !== 'y') {
        return;
      }
    }

    const tempDir = await new Promise<string>((resolve, reject) => {
      tmp.dir((err, tPath) => {
        if (err) {
          reject(err);
        }
        resolve(tPath);
      });
    });

    const ignore = await getIgnore(this.project.getPath());
    for (const sourcePath of sourcePaths) {
      // backup
      await copy(sourcePath, path.join(tempDir, sourcePath));
      // mark
      markContents(sourcePath, ignore);
    }

    try {
      this.ux.startSpinner('Retrieving Source');
      await spawnPromise({
        cmd: 'sfdx',
        args: ['force:source:retrieve', '-x', this.flags.manifest, '-u', targetUser],
        options: { shell: true },
        onStdOut: msg => this.ux.log(msg)
      });
    } catch (e) {
      this.ux.stopSpinner('failed');
      this.ux.error(`\n ${e} \n`);
      this.ux.log('Restoring source from backup');
      // restore
      for (const sourcePath of sourcePaths) {
        await copy(path.join(tempDir, sourcePath), sourcePath, { overwrite: true });
      }
      return;
    }

    for (const sourcePath of sourcePaths) {
      deletedMarked(sourcePath);
    }
    this.ux.stopSpinner('Clean Completed');

    return {};
  }
}

async function getIgnore(projectRoot: string) {
  const ig = ignore();
  const ignorePath = path.join(projectRoot, '.forceignore');
  if (fs.existsSync(ignorePath)) {
    const file = await (await fs.promises.readFile(ignorePath)).toString();
    ig.add(file);
  }

  return ig;
}

interface SpawnPromiseArgs {
  cmd: string;
  args: string[];
  options?: SpawnOptions;
  onStdOut?: (data: string) => void;
  onStdErr?: (data: string) => void;
}

function spawnPromise({ cmd, args, options, onStdOut, onStdErr }: SpawnPromiseArgs) {
  return new Promise<string>((resolve, reject) => {
    const diffProcess = spawn(cmd, args, options);
    let stdo = '';
    let err = '';
    diffProcess.stdout.on('data', d => {
      const dataStr = d.toString();
      if (onStdOut) {
        onStdOut(dataStr);
      }
      stdo += dataStr;
    });

    diffProcess.stderr.on('data', d => {
      const dataStr = d.toString();
      if (onStdErr) {
        onStdErr(dataStr);
      }
      err += dataStr;
    });

    diffProcess.on('exit', code => {
      if (code === 0) {
        return resolve(stdo);
      }
      reject(err);
    });
  });
}

function markContents(targetDir: string, ignore: Ignore) {
  fs.readdir(targetDir, (err, files) => {
    files.forEach((file, index) => {
      fs.stat(path.join(targetDir, file), (err, stat) => {
        if (err) {
          return console.error(err);
        }
        const filePath = path.join(targetDir, file);
        if (stat.isDirectory()) {
          markContents(filePath, ignore);
        } else {

          if (!ignore.ignores(filePath)) {
            fs.writeFile(filePath, FILE_MARKER_CONTENTS, (err) => {
              if (err) {
                console.log(err);
              }
            });
          }
        }
      });
    });
  });
}

function deletedMarked(targetDir: string) {
  fs.readdir(targetDir, (err, files) => {
    files.forEach((file, index) => {
      fs.stat(path.join(targetDir, file), (err, stat) => {
        if (err) {
          return console.error(err);
        }

        if (stat.isDirectory()) {
          deletedMarked(path.resolve(targetDir, file));
        } else {
          const fPath = path.join(targetDir, file);
          fs.readFile(fPath, (err, data) => {
            if (data.toString() === FILE_MARKER_CONTENTS) {
              rimraf(fPath, () => {
                console.log('removed ' + fPath);
              });
            }
          });

        }
      });
    });
  });
}
