#!/bin/bash
# Persistent dev server launcher - stays as parent to keep tree alive
cd /home/z/my-project
exec ./node_modules/.bin/next dev -p 3000
