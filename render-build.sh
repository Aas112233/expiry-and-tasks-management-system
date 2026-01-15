#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "------ INSTALLING FRONTEND DEPS ------"
npm install

echo "------ BUILDING FRONTEND ------"
npm run build

echo "------ INSTALLING BACKEND DEPS ------"
cd server
npm install

echo "------ BUILDING BACKEND ------"
npm run build

echo "------ APPLYING DATABASE MIGRATIONS ------"
npx prisma generate
npx prisma migrate deploy

echo "------ BUILD COMPLETE ------"
