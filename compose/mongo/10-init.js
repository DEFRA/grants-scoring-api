// MongoDB init script
/* eslint-disable no-undef */
db = db.getSiblingDB('grants-scoring-api')

db.hexagons.insertOne({ q: 40910, r: 16422, score: 9 })
