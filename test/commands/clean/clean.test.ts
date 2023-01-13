import { expect, test } from "@salesforce/command/lib/test";
import { ensureJsonMap, ensureString } from "@salesforce/ts-types";

describe("force:source:clean", () => {
  test
    .withOrg({ username: "test@org.com" }, true)
    .withProject({})
    .withConnectionRequest((request) => {
      const requestMap = ensureJsonMap(request);
      if (/Organization/.exec(ensureString(requestMap.url))) {
        return Promise.resolve({
          records: [
            {
              Name: "Super Awesome Org",
              TrialExpirationDate: "2018-03-20T23:24:11.000+0000"
            }
          ]
        });
      }
      return Promise.resolve({ records: [] });
    })
    .stdout()
    .command(["force:source:clean", "--targetusername", "test@org.com"])
    .it("runs force:source:clean --targetusername test@org.com", (ctx) => {
      // not sure why this fails... the generated boilerplate to debug is all f'd up
      expect(ctx.stdout).to.contain("This command can be dangerous!");
    });
});
