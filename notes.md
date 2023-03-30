# Notes

- add packages to lerna with `lerna add <package> --scope=<library-folder-name>` e.g. lerna add axios --scope=@eweser/db

## TODO:

make a logger method, like DB.logger() that can set log levels. when you initialize the database you can set the log level. Add a linter rule to make sure you don't use console.log

add linter rule for no type import without type keyword
