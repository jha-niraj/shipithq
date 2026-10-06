# One AI-build session (plan/ai-build AB-2). Claude Code runs unmodified as the `candidate`
# user; the agent (terminal, files, git, recording) runs as root so the recording and the
# stored repo under /remote are out of the candidate's reach.
FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates jq ripgrep less vim-tiny procps \
    && rm -rf /var/lib/apt/lists/*

# The agent commits and pushes as root in a repo the candidate owns.
RUN git config --system safe.directory '*' && git config --system init.defaultBranch main

# The base image's uid-1000 user becomes the candidate.
RUN usermod -l candidate -d /home/candidate -m node && groupmod -n candidate node

# Claude Code, installed with Anthropic's own installer and never modified (Claude Code's
# legal and compliance page: the binary must run as published).
USER candidate
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/candidate/.local/bin:${PATH}"
COPY --chown=candidate:candidate bashrc.sh /tmp/bashrc.sh
RUN cat /tmp/bashrc.sh >> /home/candidate/.bashrc && git config --global user.name "Candidate" && git config --global user.email "candidate@sandbox.local"
USER root

# Hooks that record the session; root-owned, so the candidate cannot edit them.
COPY managed-settings.json /etc/claude-code/managed-settings.json

COPY agent/package.json /opt/agent/package.json
RUN cd /opt/agent && npm install --omit=dev --no-audit --no-fund
COPY agent/server.mjs agent/hook.mjs /opt/agent/
COPY template /opt/template

ENV DISABLE_AUTOUPDATER=1
EXPOSE 8080
CMD ["node", "/opt/agent/server.mjs"]
