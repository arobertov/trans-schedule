<h1 align="center"><a href="https://api-platform.com"><img src="https://api-platform.com/images/logos/Logo_Circle%20webby%20text%20blue.png" alt="API Platform" width="250" height="250"></a></h1>

API Platform is a next-generation web framework designed to easily create API-first projects without compromising extensibility
and flexibility:

* Design your own data model as plain old PHP classes or [**import an existing ontology**](https://api-platform.com/docs/schema-generator).
* **Expose in minutes a hypermedia REST or a GraphQL API** with pagination, data validation, access control, relation embedding,
  filters, and error handling...
* Benefit from Content Negotiation: [GraphQL](https://api-platform.com/docs/core/graphql/), [JSON-LD](https://json-ld.org), [Hydra](https://hydra-cg.com),
  [HAL](https://github.com/mikekelly/hal_specification/blob/master/hal_specification.md), [JSON:API](https://jsonapi.org/), [YAML](https://yaml.org/), [JSON](https://www.json.org/), [XML](https://www.w3.org/XML/) and [CSV](https://www.ietf.org/rfc/rfc4180.txt) are supported out of the box.
* Enjoy the **beautiful automatically generated API documentation** ([OpenAPI](https://api-platform.com/docs/core/openapi/)).
* Add [**a convenient Material Design administration interface**](https://api-platform.com/docs/admin) built with [React](https://reactjs.org/)
  without writing a line of code.
* **Scaffold fully functional Progressive-Web-Apps and mobile apps** built with [Next.js](https://api-platform.com/docs/client-generator/nextjs/) (React),
[Nuxt.js](https://api-platform.com/docs/client-generator/nuxtjs/) (Vue.js) or [React Native](https://api-platform.com/docs/client-generator/react-native/)
thanks to [the client generator](https://api-platform.com/docs/client-generator/) (a Vue.js generator is also available).
* Install a development environment and deploy your project in production using **[Docker](https://api-platform.com/docs/distribution)**
and [Kubernetes](https://api-platform.com/docs/deployment/kubernetes).
* Easily add **[OAuth](https://oauth.net/) authentication**.
* Create specs and tests with **[a developer friendly API testing tool](https://api-platform.com/docs/distribution/testing/)**.

The official project documentation is available **[on the API Platform website](https://api-platform.com)**.

## Project Workflow

This repository contains:

* `api/` - Symfony 7.2 + API Platform backend
* `pwa/` - Next.js 15 admin and frontend
* `e2e/` - Playwright tests

### Recommended Development Setup

Use the VS Code dev container in `.devcontainer/devcontainer.json`.

It gives you:

* PHP tooling from the `php` container
* Node.js and `pnpm` inside the same VS Code environment
* predictable paths for both backend and frontend code intelligence

Open the repository in VS Code and run `Dev Containers: Reopen in Container`.

After the first start, the dev container installs:

* backend dependencies with `composer install`
* frontend dependencies with `pnpm install`

### Local Docker Commands

Start the stack:

```bash
docker compose up -d --build
```

Install backend dependencies:

```bash
docker compose exec -T php composer install
```

Install frontend dependencies:

```bash
docker compose exec -T pwa pnpm install
```

Run frontend lint:

```bash
docker compose exec -T pwa pnpm lint
```

### Environment Variables

Use `.env.docker.example` as the base for Docker-driven environments. Do not commit real production secrets.

### Production Notes

Before a production deployment:

* provide real values for `APP_SECRET`, `CADDY_MERCURE_JWT_SECRET`, `MYSQL_PASSWORD`, and `MYSQL_ROOT_PASSWORD`
* set `TRUSTED_HOSTS` for the real public domain
* keep the database port unexposed externally unless there is a clear operational reason
* build with `compose.yaml` and `compose.prod.yaml`

Example:

```bash
docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.docker up -d --build
```

API Platform embraces open web standards and the
[Linked Data](https://www.w3.org/standards/semanticweb/data) movement. Your API will automatically expose structured data.
It means that your API Platform application is usable **out of the box** with technologies of
the semantic web.

It also means that **your SEO will be improved** because **[Google leverages these formats](https://developers.google.com/search/docs/guides/intro-structured-data)**.

Last but not least, the server component of API Platform is built on top of the [Symfony](https://symfony.com) framework,
while client components leverage [React](https://reactjs.org/) ([Vue.js](https://vuejs.org/) flavors are also available).
It means that you can:

* Use **thousands of Symfony bundles and React components** with API Platform.
* Integrate API Platform in **any existing Symfony, React, or Vue application**.
* Reuse **all your Symfony and JavaScript skills**, and benefit from the incredible amount of documentation available.
* Enjoy the popular [Doctrine ORM](https://www.doctrine-project.org/projects/orm.html) (used by default, but fully optional:
  you can use the data provider you want, including but not limited to MongoDB and Elasticsearch)

## Install

[Read the official "Getting Started" guide](https://api-platform.com/docs/distribution/).

## Credits

Created by [Kévin Dunglas](https://dunglas.fr). Commercial support is available at [Les-Tilleuls.coop](https://les-tilleuls.coop).
