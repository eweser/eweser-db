This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Deploy and connect Supabase

Create a new default settings project on Supabase.
Add these environment variables to your project as per the example-env file.

```bash
NEXT_PUBLIC_SUPABASE_URL="https://asdf.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="asdf.asdf.asdf"
SUPABASE_CONNECTION_URL='postgres://postgres.asdf:asdf@aws-0-us-west-1.pooler.supabase.com:5432/postgres'
SUPABASE_SERVICE_ROLE_KEY='asdf.asdf.asdf'
```

## Sign up for and connect Y-Sweet

You can also self host a y-sweet instance, or use hosted y-sweet with self storage.
[Quick start guide](https://docs.jamsocket.com/y-sweet/quickstart)

follow their guide to generate a connection string and set it into

Add this environment variables to your project as per the example-env file.

```bash
Y_SWEET_CONNECTION_STRING=yss://asdf.asdf-asdf@y-sweet.net/p/asdf--asdf/
```

## deploy settings

Make sure to set your domain and url in the .env.local file

```bash
# prod site url/domain
NEXT_PUBLIC_AUTH_SERVER_URL='https://eweser.com'
NEXT_PUBLIC_AUTH_SERVER_DOMAIN='eweser.com'
```

And if you want to use the github actions to deploy, you will need to set these environment variables in your github secrets.

```bash
# deploy (only used on github in the .github/workflows/auth-sever-sdb-deploy.yaml file)
PRODUCTION_PROJECT_ID=asdf # supabase project id
SUPABASE_ACCESS_TOKEN=asdf # supabase access token
PRODUCTION_DB_PASSWORD=asdf # supabase db password
WORKFLOW_TOKEN=asdf # github token
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

Copy the contents of your env into vercel.
