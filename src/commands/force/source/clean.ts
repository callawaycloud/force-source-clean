import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

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

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    manifest: flags.string({char: 'x', description: messages.getMessage('manifestFlagDescription')}),
    noprompt: flags.boolean({char: 'n', description: messages.getMessage('noPromptFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    if (!this.flags.noprompt) {
      this.ux.warn(chalk.default.red(messages.getMessage('promptWarning')));
      const confirm = await this.ux.prompt('Do you wish to continue? (y)');
      if (confirm !== 'y') {
        return;
      }
    }

    const connection = this.org.getConnection();
    const sourcePaths = ((await this.project.resolveProjectConfig())['packageDirectories'] as any[]).map(d => d.path);

    for (const sourcePath of sourcePaths) {
      markContents(sourcePath);
    }

    try {
      await spawnPromise({
        cmd: 'sfdx',
        args: ['force:source:retrieve', '-x', this.flags.manifest, '-u', connection.getUsername()],
        options: {shell: true},
        onStdOut: msg => this.ux.log(msg)
      });
    } catch (e) {
      this.ux.warn('Failed to retrieve! All files are "marked" and will need to be manually reset!');
      this.ux.error(e);

      return;
    }

    for (const sourcePath of sourcePaths) {
      deletedMarked(sourcePath);
    }

    return {};
  }
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

function markContents(targetDir: string) {
  fs.readdir(targetDir, (err, files) => {
    files.forEach((file, index) => {
      fs.stat(path.join(targetDir, file), (err, stat) => {
        if (err) {
          return console.error(err);
        }

        if (stat.isDirectory()) {
          markContents(path.resolve(targetDir, file));
        } else {
          fs.writeFile(path.join(targetDir, file), FILE_MARKER_CONTENTS, (err) => {
            if (err) {
              console.log(err);
            }
          });
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
