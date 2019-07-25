const debug = require('debug')('server')
const mongodb = require('mongodb')
const client = mongodb.MongoClient


module.exports.connect = function(){
    return new Promise((resolve, reject) => {
        client.connect(process.env.MONGODB_URI, (err, cli) => {
            if(err){
                reject(err)
            }else{
                let database = cli.db(process.env.DATABASE)
                debug('Database connection done')   
                resolve(database)
            }            
        })
    })
}