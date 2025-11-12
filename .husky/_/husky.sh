#!/usr/bin/env sh
# shellcheck shell=sh

if [ -z "$husky_skip_init" ]; then
  hook_name="$(basename "$0")"
  git_params="$*"
  export husky_skip_init=1
  sh -e "$(dirname "$0")/../../node_modules/husky/husky.sh" "$hook_name" "$git_params"
fi
