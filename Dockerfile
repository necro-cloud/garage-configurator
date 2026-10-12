FROM ghcr.io/pnpm/pnpm:12.12.1 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG USERNAME=configurator
ARG GROUPNAME=configurator
ARG USER_UID=1001
ARG USER_GID=$USER_UID

RUN pnpm runtime set node 24 -g

COPY . /app
WORKDIR /app

FROM base AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --prod --frozen-lockfile

FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --prod --frozen-lockfile
RUN pnpm run build

FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

RUN addgroup -g $USER_GID $GROUPNAME \
  && adduser -u $USER_UID -G $GROUPNAME -s /bin/sh -D $USERNAME \
  && chown $USERNAME:$GROUPNAME ./

USER $USER_UID

CMD [ "node", "/app/dist/index.js" ]
