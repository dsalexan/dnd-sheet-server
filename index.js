require('dotenv').config()

const debug = require('debug')('server')
const express = require('express')
const body_parser = require('body-parser')
const cors = require('cors')
const database = require('./database')

const fs = require('fs')
const path = require('path')

const server = express()

database.connect().then((db) => {
    global.database = db
    server.listen(process.env.PORT, function () {
        debug(`Server is up at http://localhost:${process.env.PORT}`)
    })
})

server.use(body_parser.urlencoded({ extended: true }))

server.use(cors());


server.use((req, res, next) => {
    debug(`${req.method} ${req.url}`)
    next()
})

server.get('/resources', (req, res) => {
    let q = req.query.q
    debug(`RESOURCES ${q}`)

    global.database.collection('slugs').aggregate([
        {
            '$match': {
                'path': q
            }
        }, {
            '$lookup': {
                'from': 'resources',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'resource'
            }
        }, {
            '$addFields': {
                'resource.path': {
                    '$arrayElemAt': [
                        '$path', 1
                    ]
                }
            }
        }, {
            '$replaceRoot': {
                'newRoot': {
                    '$arrayElemAt': [
                        '$resource', 0
                    ]
                }
            }
        }
    ]).toArray((err, docs) => {
        debug('RESOURCES entry found')
        res.send(docs)
    })
})

server.get('/classes', (req, res) => {
    let q = req.query.q
    debug(`CLASSES ${q}`)

    global.database.collection('resources').aggregate([
        {
          '$match': {
            '$or': [
              {
                'name': q
              }, {
                'name.en': q
              }, {
                'name.pt-BR': q
              }
            ],
            'meta': 'class'
          }
        }
      ]).toArray((err, docs) => {
        debug('CLASS entry found')
        res.send(docs)
    })
})

server.get('/backgrounds', (req, res) => {
    let q = req.query.q
    debug(`BACKGROUND ${q}`)

    global.database.collection('resources').aggregate([
        {
          '$match': {
            '$or': [
              {
                'name': q
              }, {
                'name.en': q
              }, {
                'name.pt-BR': q
              }
            ],
            'meta': 'background'
          }
        }
      ]).toArray((err, docs) => {
        debug('BACKGROUND entry found')
        res.send(docs)
    })
})

server.get('/races', (req, res) => {
  let q = req.query.q
  debug(`RACE ${q}`)

  global.database.collection('resources').aggregate([
      {
        '$match': {
          '$or': [
            {
              'name': q
            }, {
              'name.en': q
            }, {
              'name.pt-BR': q
            }
          ],
          'meta': 'race'
        }
      }
    ]).toArray((err, docs) => {
      debug('RACE entry found')
      res.send(docs)
  })
})

server.get('/database', (req, res) => {
  let insert = !!req.query.insert

  let files = fs.readdirSync('./database')
  let objs = files.map(f => {
    if(f == 'readme.md') return []
    if(f == 'test.json') return []
    if(f == 'input.json') return []

    let file = fs.readFileSync('./database/' + f, 'utf-8')
    file = '{"file":' + file + '}'
    let json
    try{
      json = JSON.parse(file)
    }catch(err){
      console.error(err)
      debugger
    }
    return json.file
  })

  objs = objs.reduce((arr, cur) => arr.concat(cur), [])
  objs.sort((a, b) => a._id.localeCompare(b._id))

  objs = objs.map(o => ({
    ...o,
    _modified_at: new Date()
  }))

  if(insert){
    global.database.collection('resources').deleteMany({})
    global.database.collection('resources').insertMany(
      objs
    )
  }

  res.send(objs)
})

server.get('/:meta', (req, res) => {
  let meta = req.params.meta

  let q = req.query.q
  let max = req.query.max || 1000
  let query = req.query.query || undefined
  debug(`FIND RESOURCE ${q} IN META ${meta}`)

  let agg = [
    {
      '$facet': {
        'slugs': [
          {
            '$unwind': {
              'path': '$path'
            }
          }, {
            '$match': {
              'path': {
                '$regex': q
              }
            }
          }
        ]
      }
    }, {
      '$unwind': {
        'path': '$slugs', 
        'includeArrayIndex': 'slugs.index'
      }
    }, {
      '$replaceRoot': {
        'newRoot': '$slugs'
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }, 
        'index': {
          '$push': '$index'
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'path': 1, 
        'index': {
          '$arrayElemAt': [
            '$index', 0
          ]
        }
      }
    }, {
      '$sort': {
        'index': 1
      }
    }, {
      '$lookup': {
        'from': 'resources', 
        'localField': '_id', 
        'foreignField': '_id', 
        'as': 'resource'
      }
    }, {
      '$addFields': {
        'resource.path': {
          '$arrayElemAt': [
            '$path', 1
          ]
        }
      }
    }, {
      '$replaceRoot': {
        'newRoot': {
          '$mergeObjects': [
            {
              '$arrayElemAt': [
                '$resource', 0
              ]
            }, {
              'path': '$path'
            }
          ]
        }
      }
    }, {
      '$match': {
        'meta': meta
      }
    }
  ]

  if(query){
    console.log(query)
    agg.push({
      '$match': JSON.parse(query.replace(/\'+/gm, '\"'))
    })
    console.log(agg)
  }

  global.database.collection(`slugs`).aggregate(agg).toArray((err, docs) => {
    debug(`META RESOURCE (${meta}) found`)
    res.send(docs.splice(0, max))
  })
})

server.get('/', (req, res) => {
  let q = req.query.q
  let max = req.query.max || 1000
  let query = req.query.query
  let start = req.query.start || false
  debug(`FIND RESOURCE ${q}`)

  let agg = [
    {
      '$facet': {
        'slugs': [
          {
            '$unwind': {
              'path': '$path'
            }
          }, {
            '$match': {
              'path': {
                '$regex': (start ? '^' : '') + q
              }
            }
          }
        ]
      }
    }, {
      '$unwind': {
        'path': '$slugs', 
        'includeArrayIndex': 'slugs.index'
      }
    }, {
      '$replaceRoot': {
        'newRoot': '$slugs'
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }, 
        'index': {
          '$push': '$index'
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'path': 1, 
        'index': {
          '$arrayElemAt': [
            '$index', 0
          ]
        }
      }
    }, {
      '$sort': {
        'index': 1
      }
    }, {
      '$lookup': {
        'from': 'resources', 
        'localField': '_id', 
        'foreignField': '_id', 
        'as': 'resource'
      }
    }, {
      '$addFields': {
        'resource.path': {
          '$arrayElemAt': [
            '$path', 1
          ]
        }
      }
    }, {
      '$replaceRoot': {
        'newRoot': {
          '$mergeObjects': [
            {
              '$arrayElemAt': [
                '$resource', 0
              ]
            }, {
              'path': '$path'
            }
          ]
        }
      }
    }
  ]

  if(query){
    console.log(query)
    agg.push({
      '$match': JSON.parse(query.replace(/\'+/gm, '\"'))
    })
    console.log(agg)
  }

  global.database.collection(`slugs`).aggregate(agg).toArray((err, docs) => {
    debug(`RESOURCE found`)
    res.send(docs.splice(0, max))
  })
})