const express = require('express')
const app = express()
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')

const cors = require('cors')

const whitelist = ["http://localhost:3000"]

// Setting up CORS
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
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    key: "userId",
    secret: "metadata",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 2,
    },
}));


// Setting up MySQL
const db = mysql.createConnection({
    user: 'metadata_sp',
    host: 'rohancp.sdsu.edu',
    password: 'Srp##170895',
    database: 'metadata_ebook_collection_test',
});


// Login Function
app.post('/auth',(req, res) => {
   
    const { user, pwd } = req.body;
    query_stmt = "SELECT Name FROM `User` WHERE Name = ? AND PWD = ?";
    db.query(query_stmt, [user, pwd], (err, result) => {
        if(err) {
            console.log(err)
        } else {
            if (result.length === 1) {
                req.session.user = result;
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


// Get all e-collections
app.get('/allcollections',(req, res) => {
    db.query("SELECT * FROM AllEbookCollections", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//Add a new all e-collections
app.post('/allcollections-add',(req, res) => {

    let { collectionID, collectionName, resourceType, bibSource, updateFreq, active, perpetual, aggregator, datasync, oa, reclamation, collectionVendor, collectionNotes } = req.body;
    collectionID = BigInt(collectionID);

    let sql_query = "INSERT INTO `AllEbookCollections` (`Collection ID`, `Collection Name`, `Resource Type`, `Bib Source`, `Update Frequency`, `Active?`, `Perpetual?`, `Aggregator?`, `Data Sync?`, `OA?`, `Reclamation?`, `Vendor`, `Note`) SELECT `Collection ID`, `Collection Name`, `Resource Type`, `Bib Source`, `Update Frequency`, `Active?`, `Perpetual?`, `Aggregator?`, `Data Sync?`, `OA?`, `Reclamation?`, `Vendor`, `Note` FROM (SELECT "+collectionID+" AS `Collection ID`, '"+collectionName+"' AS `Collection Name`, '"+resourceType+"' AS `Resource Type`, '"+bibSource+"' AS `Bib Source`, '"+updateFreq+"' AS `Update Frequency`, "+active+" AS `Active?`,"+perpetual+" AS `Perpetual?`, "+aggregator+" AS `Aggregator?`, "+datasync+" AS `Data Sync?`, "+oa+" AS `OA?`, "+reclamation+" AS `Reclamation?`, '"+collectionVendor+"' AS `Vendor`, '"+collectionNotes+"' AS `Note`) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.sendStatus(200);
        }
    
    })
})

app.delete('/allcollections-delete/:value',(req, res) => {

    console.log(req.params.value);
    let col_Id = req.params.value;

    query_stmt = "DELETE FROM `AllEbookCollections` WHERE `Collection ID` = ?";
    db.query(query_stmt, [col_Id], (err, result) => {
        if(err) {
            console.log(err)
            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    })
})


// In Progress 
app.post("/allcollections-edit", async (req, res) => {
    
    const oldID = Number(req.body["oldID"]);
    let dataUpdate = "";

    if (req.body["namecheck"] === "on"){
        dataUpdate = dataUpdate + "`Collection Name`='"+req.body["ename"]+"',";
    }
    if(req.body["resourcecheck"] === "on"){
        dataUpdate = dataUpdate + "`Resource Type`='"+req.body["resourceType"]+"',";
    }
    if(req.body["bibcheck"] === "on"){
        dataUpdate = dataUpdate + "`Bib Source`='"+req.body["ebib"]+"',";
    }
    if(req.body["updatecheck"] === "on"){
        dataUpdate = dataUpdate + "`Update Frequency`='"+req.body["updateFreq"]+"',";
    }
    if(req.body["activecheck"] === "on"){
        dataUpdate = dataUpdate + "`Active?`="+req.body["active"]+",";
    }
    if(req.body["perpcheck"] === "on"){
        dataUpdate = dataUpdate + "`Perpetual?`="+req.body["perpetual"]+",";
    }
    if(req.body["aggcheck"] === "on"){
        dataUpdate = dataUpdate + "`Aggregator?`="+req.body["aggregator"]+",";
    }
    if(req.body["datasynccheck"] === "on"){
        dataUpdate = dataUpdate + "`Data Sync?`="+req.body["datasync"]+",";
    }
    if(req.body["oacheck"] === "on"){
        dataUpdate = dataUpdate + "`OA?`="+req.body["oa"]+",";
    }
    if(req.body["reclamationcheck"] === "on"){
        dataUpdate = dataUpdate + "`Reclamation?`="+req.body["reclamation"]+",";
    }
    if(req.body["vendorcheck"] === "on"){
        dataUpdate = dataUpdate + "`Vendor`='"+req.body["vendor"]+"',";
    }
    if(req.body["notecheck"] === "on"){
        dataUpdate = dataUpdate + "`Note`='"+req.body["enote"]+"',";
    }
    if(req.body["idcheck"] === "on"){
        dataUpdate = dataUpdate + "`Collection ID`="+req.body["eid"];
    }


    try {
        const resultData = db.query("UPDATE `AllEbookCollections` SET "+dataUpdate.slice(0,-1)+" WHERE `Collection ID` = "+oldID, (err, result) => {
            if(result) { 
                res.status(200).send({"message":"Data Updated Successfully"})
            }
        });

    } catch (err) {
        console.log(err);
        if (err instanceof Errors.NotFound)
            return res.status(HttpStatus.NOT_FOUND).send({ message: err.message }); // 404
        
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: err, message: err.message }); // 500
    }

})


//Get all vendors name from VendorList
app.get('/vendors-name',(req, res) => {
    db.query("SELECT `Vendor Name` FROM VendorList", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all vendors
app.get('/vendors',(req, res) => {
    db.query("SELECT * FROM VendorList", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all vendors-delete
app.delete('/vendors-delete/:value', async (req, res) => {
    let data = req.params.value;
    let vendorId = Number(data.split("&")[0]);
    let vendorName = data.split("&")[1];
    db.query("DELETE FROM `VendorList` WHERE `Vendor Name` = ? AND `Vendor ID` = ?", [vendorName, vendorId], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

app.post('/vendors-add',(req, res) => {
    const { vendorId, vendorName, vendorWeb, userName, password, note, contact } = req.body;
    
    query_stmt = "INSERT INTO `VendorList` (`Vendor ID`, `Vendor Name`, `Vendor Web`, `Vendor Web UserName`, `vendor Web PWD`, `Note`, `Vendor Contact`) VALUES (?, ?, ?, ?, ?, ?, ?)";    
    
    db.query(query_stmt, [vendorId, vendorName, vendorWeb, userName, password, note, contact], (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.sendStatus(200);
        }
    
    })
})

// Update Vendor Item
app.post("/vendors-edit", (req, res) => {
    
    const oldID = req.body["oldID"];
    let setError = false;


    if ( (req.body["idCheck"] === "on") & (req.body["collectionID"]!="") ) {
        const eVendorID = req.body["vendorId"];
        db.query("UPDATE `VendorList` SET `Vendor ID`=? WHERE `Vendor ID` = ?", [eVendorID,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500);
            } else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

    if ( (req.body["namecheck"] === "on") & (req.body["name"]!="") ) {
        const vName = req.body["name"];
        db.query("UPDATE `VendorList` SET `Vendor ID`=? WHERE `Vendor Name` = ?", [vName,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500);
            } else {
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }
    if ((req.body["webcheck"] === "on") ){
        const web = req.body["vendorWeb"];
        db.query("UPDATE `VendorList` SET `Vendor Web`=? WHERE `Vendor ID` = ?", [web,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500)
            } else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }
    
    if ((req.body["usernamecheck"] === "on")){
        const userName = req.body["userName"];
        db.query("UPDATE `VendorList` SET `Vendor Web UserName`=? WHERE `Vendor ID` = ?", [userName,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

    if ((req.body["pwdcheck"] === "on")) {
        const password = req.body["password"];
        db.query("UPDATE `VendorList` SET `Vendor Web PWD`=? WHERE `Vendor ID` = ?", [password,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

    if (req.body["notecheck"] === "on"){
        const note = req.body["vendornote"];
        db.query("UPDATE `VendorList` SET `Note`=? WHERE `Vendor ID` = ?", [note,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

    if ((req.body["contactcheck"] === "on")) {
        const contact = req.body["contact"];
        db.query("UPDATE `VendorList` SET `Vendor Contact`=? WHERE `Vendor ID` = ?", [contact,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

})


// Get all P Collections
app.get('/pcollections',(req, res) => {
    db.query("SELECT * FROM `973P-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all E Collections of 973
app.get('/ecollections',(req, res) => {
    db.query("SELECT * FROM `973E-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all 973 Collections
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

// Update E Collection Item of 973
app.post('/ecollections-edit', (req, res) => {

    const oldID = req.body["oldID"];
    let setError = false;

    if ( (req.body["namecheck"] === "on") & (req.body["e973name"]!="") ) {
        const eName = req.body["e973name"];
        db.query("UPDATE `973E-CollectionName` SET `973Value`=? WHERE `973Value` = ?", [eName,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500);
            } else {
                
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }
    if ((req.body["bibcheck"] === "on") & (req.body["e973bib"]!=3) ){
        const bib = req.body["e973bib"];
        db.query("UPDATE `973E-CollectionName` SET `973inAllBIB`=? WHERE `973Value` = ?", [bib,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500)
            } else {
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }
    
    if ((req.body["nrcheck"] === "on") & (req.body["e973nr"]!=3) ){
        const nr = req.body["e973nr"];
        db.query("UPDATE `973E-CollectionName` SET `973NormRule`=? WHERE `973Value` = ?", [nr,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }

    if ((req.body["izcheck"] === "on") & (req.body["e973iz"]!=3)) {
        const iz = req.body["e973iz"];
        db.query("UPDATE `973E-CollectionName` SET `IZonly?`=? WHERE `973Value` = ?", [iz,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }

    if (req.body["notecheck"] === "on"){
        const note = req.body["e973note"];
        db.query("UPDATE `973E-CollectionName` SET `Note`=? WHERE `973Value` = ?", [note,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                }
            }
        })
    }

    if (setError) {
        res.sendStatus(404);
    } else {
        res.sendStatus(200);
    }   
})

// Delete E Collection Item of 973
app.delete('/ecollections-delete/:value', async (req, res) => {
    let e973Val = req.params.value;
    db.query("DELETE FROM `973E-CollectionName` WHERE `973Value` = ?", [e973Val], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

// Add E Collection Item of 973
app.post('/ecollections-add', async (req, res) => {
    
    const e973id = BigInt(req.body["e973id"]);
    const eName = req.body["e973name"];
    const bib = req.body["e973bib"];
    const nr = req.body["e973nr"];
    const iz = req.body["e973iz"];
    const note = req.body["e973note"]!==""?req.body["e973note"]:"\'\'";

    let sql_query = "INSERT INTO `973E-CollectionName`(`CollectionID`,`973Value`,`973inAllBIB`,`973NormRule`,`IZonly?`,`Note`) SELECT `CollectionID`,`973Value`,`973inAllBIB`,`973NormRule`,`IZonly?`,`Note` FROM (SELECT "+e973id+" AS CollectionID, '"+eName+"' AS 973Value, "+bib+" AS 973inAllBIB, "+nr+" AS 973NormRule, "+iz+" AS `IZonly?`, "+note+" as Note) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err);
        }else{
            res.sendStatus(200);
        }
    })
    
})

// Update P Collection Item
app.post('/pcollections-edit', async (req, res) => {

    const oldID = req.body["oldID"];
    let setError = false;

    if ( (req.body["namecheck"] === "on") & (req.body["p973name"]!="") ) {
        const eName = req.body["p973name"];
        await db.query("UPDATE `973P-CollectionName` SET `CollectionName`=? WHERE `CollectionName` = ?", [eName,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
                res.sendStatus(500);
            } else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }
    
    if (req.body["notecheck"] === "on"){
        const note = req.body["p973note"];
        db.query("UPDATE `973P-CollectionName` SET `Note`=? WHERE `CollectionName` = ?", [note,oldID], (err, result) => {
            if(err) {
                console.log(err);
                setError = true;
            }else {
                if(result.affectedRows === 0) {
                    setError = true;
                    res.sendStatus(404);
                }
            }
        })
    }

})

// Delete P Collection Item
app.delete('/pcollections-delete/:value', async (req, res) => {
    let name = req.params.value;
    db.query("DELETE FROM `973P-CollectionName` WHERE `CollectionName` = ?", [name], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

// Add P Collection Item
app.post('/pcollections-add', async (req, res) => {

    const pName = req.body["p973name"];
    const note = req.body["p973note"]!==""?req.body["p973note"]:"\'\'";

    let sql_query = "INSERT INTO `973P-CollectionName`(`CollectionName`,`Note`) SELECT `CollectionName`,`Note` FROM (SELECT '"+pName+"' AS CollectionName, "+note+" as Note) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err);
        }else{
            res.sendStatus(200);
        } 
    })
    
})


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=>{
   console.log("server running on 3001"); 
});

