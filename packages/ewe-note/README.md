# EweNotes

A simple note taking app that syncs to the cloud, while also being able to work offline.

Built using [eweser-db](https://github.com/eweser/eweser-db)

## Development Setup

You'll want to either point the app to a Eweser DB instance or run your own instance of the Eweser DB server. You can set the `AUTH_SERVER` environment variable to point to your Eweser DB instance.

To run your own instance check out the /server readme at [eweser-db repo](https://github.com/eweser/eweser-db)

## TODO:

- [ ] App bar with login, profile, and sync status
- [ ] Require signup at first, and get eweser db integrated
- [ ] Allow offline-first and non-logged in user usage.
- [ ] Show sync status with icons and not logged in would be broken sync icon.
