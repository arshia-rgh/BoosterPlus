#!/bin/sh
set -eu
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
cp -R ent "$work/ent"
go generate ./ent
diff -ru "$work/ent" ent
