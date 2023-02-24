const express = require('express')
const app = express()
const mysql = require('mysql')

const cors = require('cors')

const whitelist = ["http://localhost:3000"]
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH'],
}
app.use(cors(corsOptions));
app.use(express.json());




const db = mysql.createConnection({
    user: 'metadata_sp',
    host: 'rohancp.sdsu.edu',
    password: 'Srp##170895',
    database: 'metadata_ebook_collection_test',
});



app.post('/auth',(req, res) => {
   
    const { user, pwd } = req.body;
    query_stmt = "SELECT * FROM `User` WHERE Name = ? AND PWD = ?";
    db.query(query_stmt, [user, pwd], (err, result) => {
        if(err) {
            console.log(err)
        } else {
            if (result.length === 1) {
                res.status(200).send(result);
            } else if ( result.length > 1){
                res.status(500).send("User Conflict.");
            } else if ( result.length === 0){
                res.status(401).send("Unauthorized.")
            } else {
                res.status(404).send("Some error occurred.");
            }
        }
    })
})



app.get('/allcollections',(req, res) => {
    db.query("SELECT * FROM AllEbookCollections", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/vendors',(req, res) => {
    db.query("SELECT * FROM VendorList", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/pcollections',(req, res) => {
    db.query("SELECT * FROM `973P-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/ecollections',(req, res) => {
    db.query("SELECT * FROM `973E-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})


app.get('/ecollections-edit',(req, res) => {
    const { id } = req.body;
    db.query("SELECT * FROM `AllEbookCollections` WHERE CollectionID = ?", [id], (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})


app.listen(3001, ()=>{
   console.log("server running on 3001"); 
});

