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

app.get('/all973collections',(req, res) => {
    sql = "SELECT `CollectionName`, 'P' AS `P/E` FROM `973P-CollectionName` Union SELECT 	`973Value` AS `CollectionName`, 'E' AS `P/E` FROM `973E-CollectionName` Order by `CollectionName`";
    db.query( sql, (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.post('/ecollections-edit', async (req, res) => {

    const oldID = req.body["oldID"];
    let setError = false;

    if ( (req.body["namecheck"] === "on") & (req.body["e973name"]!="") ) {
        const eName = req.body["e973name"];
        await db.query("UPDATE `973E-CollectionName` SET `973Value`=? WHERE `973Value` = ?", [eName,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500);
            } 
        })
    }
    if ((req.body["bibcheck"] === "on") & (req.body["e973bib"]!=3) ){
        const bib = req.body["e973bib"];
        await db.query("UPDATE `973E-CollectionName` SET `973inAllBIB`=? WHERE `973Value` = ?", [bib,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500)
            } 
        })
    }
    
    if ((req.body["nrcheck"] === "on") & (req.body["e973nr"]!=3) ){
        const nr = req.body["e973nr"];
        await db.query("UPDATE `973E-CollectionName` SET `973NormRule`=? WHERE `973Value` = ?", [nr,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }
        })
    }

    if ((req.body["izcheck"] === "on") & (req.body["e973iz"]!=3)) {
        const iz = req.body["e973iz"];
        db.query("UPDATE `973E-CollectionName` SET `IZonly?`=? WHERE `973Value` = ?", [iz,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }
        })
    }

    if (req.body["notecheck"] === "on"){
        const note = req.body["e973note"];
        db.query("UPDATE `973E-CollectionName` SET `Note`=? WHERE `973Value` = ?", [note,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }
        })
    }

    res.sendStatus(200);
})

app.delete('/ecollections-delete/:value', async (req, res) => {
    let e973Val = req.params.value;
    db.query("DELETE FROM `973E-CollectionName` WHERE `973Value` = ?", [e973Val], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})


app.listen(3001, ()=>{
   console.log("server running on 3001"); 
});

