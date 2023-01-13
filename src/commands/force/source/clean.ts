import { flags, SfdxCommand } from "@salesforce/command";
import { Messages } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as chalk from "chalk";
import * as fs from "fs";
import ignore, { Ignore } from "ignore";
import * as path from "path";
const copy = require("recursive-copy");
import * as rimraf from "rimraf";
import * as tmp from "tmp";
import { spawnPromise } from "../../../lib";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("force-source-clean", "clean");

const FILE_MARKER_CONTENTS = "[DELETE]";

export default class Clean extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    "$ sfdx force:source:clean -x manifest/package.xml",
    "$ sfdx force:source:clean -x manifest/package.xml --noprompt"
  ];

  protected static flagsConfig = {
    manifest: flags.string({
      char: "x",
      description: messages.getMessage("manifestFlagDescription"),
      default: path.join("manifest", "package.xml")
    }),
    noprompt: flags.boolean({ char: "n", description: messages.getMessage("noPromptFlagDescription") })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    const connection = this.org.getConnection();
    const targetUser = connection.getUsername();
    const sourcePaths = ((await this.project.resolveProjectConfig())["packageDirectories"] as any[]).map((d) => d.path);
    if (!this.flags.noprompt) {
      this.ux.warn(
        `${chalk.bold.red(
          "This command can be dangerous!"
        )} It is intended to be used along side source control.  IT WILL REMOVE ALL FILES FROM ${chalk.red(
          sourcePaths.map((p) => path.join(this.project.getPath(), p)).join(" & ")
        )} WHICH ARE NOT FOUND IN THE TARGET ORG (${targetUser}).  They will not be recoverable unless tracked in source control!`
      );
      const confirm = await this.ux.prompt("Do you wish to continue? (y)");
      if (confirm !== "y") {
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
      this.ux.startSpinner("Retrieving Source");
      await spawnPromise({
        cmd: "sfdx",
        args: ["force:source:retrieve", "-x", this.flags.manifest, "-u", targetUser],
        options: { shell: true },
        onStdOut: (msg) => this.ux.log(msg)
      });
    } catch (e) {
      this.ux.stopSpinner("failed");
      this.ux.error(`\n ${e} \n`);
      this.ux.log("Restoring source from backup");
      // restore
      for (const sourcePath of sourcePaths) {
        await copy(path.join(tempDir, sourcePath), sourcePath, { overwrite: true });
      }
      return;
    }

    for (const sourcePath of sourcePaths) {
      deletedMarked(sourcePath);
    }
    this.ux.stopSpinner("Clean Completed");

    return {};
  }
}

async function getIgnore(projectRoot: string) {
  const ig = ignore();
  const ignorePath = path.join(projectRoot, ".forceignore");
  if (fs.existsSync(ignorePath)) {
    const file = await (await fs.promises.readFile(ignorePath)).toString();
    ig.add(file);
  }

  return ig;
}

/** The following code:
 * 1. Copies the contents of the source directory to the target directory
 * 2. Marks all files in the target directory with a special marker
 *    that can be used to determine if the file was updated later
 */
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
            //NOTE: This used to unlink files that did not end in -meta.xml, but the retrieve command now checks that these exist.
            //      Now we just tag everything with the marker.
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

/** The following code:
 * 1. Recursively traverses the target directory
 * 2. For each file, it checks if it is a meta file
 * 3. If it is a meta file, it reads the contents
 * 4. If the contents are the marker, it deletes the file
 * 5. If the contents are not the marker, it does nothing
 */
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
                console.log("removed " + fPath);
              });
            }
          });
        }
      });
    });
  });
}
