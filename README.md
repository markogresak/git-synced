# git-synced


## Setup

*Note 1: `nodegit` requires C compiler, check [nodegit Getting started](https://github.com/nodegit/nodegit#getting-started) on how to configure it, if installation fails.*
*Note 2: installing using `yarn` will most likely fail when installing nodegit*

 1. clone the repo and install dependencies using `npm install`
 2. create files `.env` and `sync-config.yml`, ensure git is configured to be able to clone without prompt
 3. use `npm start` to run the server
 4. configure GitHub repository webhooks and point it to server (make sure to use public IP)


## Configuration

#### .env:

 - `GITHUB_WEBHOOK_SECRET`: a secred shared with GitHub's webhook config
 - `GITHUB_TOKEN`: github token which authorizes at least repo permissions
 - `SYNC_AT_START`: set to `true` if script should add all branch pairs to sync job on start
 - `MAILGUN_API_KEY`: Mailgun API key
 - `MAILGUN_DOMAIN`: Mailgun domain name
 - `MAIL_SEND_FROM`: e-mail address to use as mail "from" address
 - `MAIL_SEND_TO`: e-mail address(es) to send mail to, for multiple addresses, separate each address with `,`

#### sync-config.yml

 - `repositories`: list of repositories to handle, each should contain the following properties:
   - `remote_url`: URL where repository is hosted
   - `local_path`: path where the repository will be cloned to, either absolute or relative to project root
   - `branches`: list of branches to match for syncing, each can be either a plain string (exact match) or an object, which can specify:
     - `regex`: regex used to match branches
     - `sort` (optional): if set to `semver`, [`semverSort.asc`](https://github.com/ragingwind/semver-sort) will be used, otherwise defaults to alphabetical sort


## Testing (development)

Use `npm test` to run linter and tests or `npm run test:coverage` to see coverage.

For watch mode (re-run tests when code changes), use `npm run test:watch`.
