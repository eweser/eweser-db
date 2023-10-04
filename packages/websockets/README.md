# Eweser Public Aggregator

A server that listens to Matrix rooms marked as public by @eweser/db users, and provides a public API for accessing the data.

## Dev

Make a dev cert with [mkcert](https://github.com/FiloSottile/mkcert)

```
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

Move to the certs folder and rename the files to `cert.pem` and `key.pem`
