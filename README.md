# grants-scoring-api

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
- [API Security](#api-security)
- [API endpoints](#api-endpoints)
  - [Scoring Endpoint Details](#scoring-endpoint-details)
  - [Validate Location Endpoint Details](#validate-location-endpoint-details)
- [Location Data](#location-data)
  - [Data Load](#data-load)
- [Development helpers](#development-helpers)
- [Docker](#docker)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd grants-scoring-api
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

The tests are run using vitest and configured to run unit, integration and code coverage tests.

Integration tests live in the `test/integration` directory and are configured in the `vitest.config.js` file

Integration tests require light throwaway containers (`testcontainers`) to be spun up (`test/integration/hooks/globalSetup.js`) and destroyed (`test/integration/hooks/globalTeardown`) before starting test execution

The following containers are provisioned:

    mongodb

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
docker compose up
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

## API Security

On all environments, except local, the API is secured using service to service authentication.
A JWT bearer token must be provided in the `Authorization` header.
Only tokens provided by the correct issuer are accepted.
The audience must match this service.
The subjects are restricted based on an externally configured list.

## API endpoints

The API specification is documented in [openapi.yaml](docs/openapi.yaml).

| Endpoint                  | Description               |
| :------------------------ | :------------------------ |
| `GET: /scoring/{grant}`   | Scoring for a given grant |
| `GET: /validate/location` | Validate Location         |

### Scoring Endpoint Details

The scoring endpoint evaluates a grant application based on the project location, the sector, whether planning permission and water abstraction licence
have already been granted, and how many businesses the project will assist.

#### Path Parameters

- `grant` (required): The grant identifier. Currently, only `water-management` is supported.

#### Query Parameters

- Please see [openapi.yaml](docs/openapi.yaml) for details.

### Validate Location Endpoint Details

The validation endpoint accepts an easting and northing value, and indicates whether this location is in England and can therefore be used to provide a valid score.

## Location Data

The location data is stored in the attached MongoDB database as a collection named `hexagons`. These are simple records of hexagonal cells covering all of England.
These are of the form

```
  { q: 123, r 456: score: 5 }
```

Where q and r represent the midpoint of a hexagon, and the score is the associated water scarcity value for that hexagon.
Incoming easting and northing values are converted to hexagon coordinates, to snap to the centre of the nearest hexagon.
This data is non-sensitive and is publicly available and will be published as part of the user guidance as a magic map.

### Data Load

The data is loaded from JSON files, which must be named `*.json` and placed in the `data` directory.
There are over 15 million hexagon entries, and these are loaded into the database on startup in batches, packaged across
several versions of the application, to avoid over inflating the repository, and to allow data to be loaded in chunks into MongoDB.

## Development helpers

## Docker

Build:

```bash
docker build --no-cache --tag grants-scoring-api .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 grants-scoring-api
```

### Docker Compose

A local environment with:

- Floci for AWS services (S3, SQS, SNS etc)
- MongoDB
- This service

```bash
docker compose up --build -d
```

Mock AWS resources can be created when Floci starts up by editing the scripts in `./compose/floci/start.d/`.
MongoDB records can also be created when Mongo starts by editing the scripts in `./compose/mongo/`.

### Dependabot

Dependabot is enabled for this repository, and configured in file `.github/dependabot.yml`

### SonarCloud

Sonarcloud is enabled for this repository, please see https://sonarcloud.io/project/overview?id=DEFRA_grants-scoring-api

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
