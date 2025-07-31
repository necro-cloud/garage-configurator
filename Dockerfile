FROM node:24.4.1-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG USERNAME=configurator
ARG GROUPNAME=configurator
ARG USER_UID=1001
ARG USER_GID=$USER_UID

RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

RUN addgroup -g $USER_GID $GROUPNAME \
  && adduser -u $USER_UID -G $GROUPNAME -s /bin/sh -D $USERNAME \
  && chown $USERNAME:$GROUPNAME ./

USER $USER_UID

CMD [ "node", "/app/dist/index.js" ]
