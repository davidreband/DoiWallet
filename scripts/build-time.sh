#!/bin/sh

# When this build was made, as a JSON string. The About screen used to show the app's first
# install time on the device instead, which on a phone the wallet had been on since 2024 read
# "17 July 2024" no matter which release was running.
#
# UTC, so a build does not change its stamp with the builder's timezone.

echo \"`date -u +%Y-%m-%dT%H:%M:%SZ`\"
