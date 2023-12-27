/*
Date: 5 September 2023
Author: Sheetal
Description: This file is the main file for the backend server. It contains all the routes and functions for the backend server.
*/

const express = require('express')
const app = express()
const mysql = require('mysql')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
require('dotenv').config()
const axios = require('axios')

const cors = require('cors')
const { APIError } = require('rest-api-errors')

const whitelist = ["https://metadata.sdsu.edu"]
// const whitelist = ["https://metadata.sdsu.edu", "http://localhost:3000"] 

// Extract all the environment variables from .env file
const API_TOKEN = process.env.ALMA_API_KEY;
const backend_user = process.env.user;
const backend_password = process.env.password;
const backend_host = process.env.host;
const backend_database = process.env.database;


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

// Setting up Session
app.use(session({
    key: "userId",
    secret: "metadata",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 1000 * 60 * 60 * 2,
    },
}));


// Setting up MySQL
const db = mysql.createConnection({
    user: backend_user,
    host: backend_host,
    password: backend_password,
    database: backend_database,
});


// Login Function
app.post('/server/auth',(req, res) => {
   
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
app.get('/server/allcollections',(req, res) => {
    db.query("SELECT CAST(`Collection ID` AS VARCHAR(25)) AS `Collection ID`, `Collection Name`, `Resource Type`, `Bib Source`, `Update Frequency`, `PO Linked?`, `Active?`, `Perpetual?`, `Aggregator?`, `Data Sync?`, `OA?`, `Reclamation?`, `Vendor`, `Lendable Note`, `Note` from `AllEbookCollections`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//Add a new all e-collections
app.post('/server/allcollections-add',(req, res) => {

    let { collectionID, collectionName, resourceType, bibSource, updateFreq, po, active, perpetual, aggregator, datasync, oa, reclamation, collectionVendor, lendable, collectionNotes } = req.body;
    collectionID = BigInt(collectionID);

    collectionName = collectionName.replaceAll("\'","\\'");
    collectionNotes = collectionNotes.replaceAll("\'","\\'");


    let sql_query = "INSERT INTO `AllEbookCollections` (`Collection ID`, `Collection Name`, `Resource Type`, `Bib Source`, `Update Frequency`, `PO Linked?`, `Active?`, `Perpetual?`, `Aggregator?`, `Data Sync?`, `OA?`, `Reclamation?`, `Vendor`, `Lendable Note`, `Note`) SELECT `Collection ID`, `Collection Name`, `Resource Type`, `Bib Source`, `Update Frequency`, `PO Linked?`, `Active?`, `Perpetual?`, `Aggregator?`, `Data Sync?`, `OA?`, `Reclamation?`, `Vendor`,`Lendable Note`, `Note` FROM (SELECT "+collectionID+" AS `Collection ID`, '"+collectionName+"' AS `Collection Name`, '"+resourceType+"' AS `Resource Type`, '"+bibSource+"' AS `Bib Source`, '"+updateFreq+"' AS `Update Frequency`, "+po+" AS `PO Linked?`, "+active+" AS `Active?`,"+perpetual+" AS `Perpetual?`, "+aggregator+" AS `Aggregator?`, "+datasync+" AS `Data Sync?`, "+oa+" AS `OA?`, "+reclamation+" AS `Reclamation?`, '"+collectionVendor+"' AS `Vendor`, '"+lendable+"' AS `Lendable Note`, '"+collectionNotes+"' AS `Note`) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.sendStatus(200);
        }
    
    })
})

// Select a value from all e-collections
app.get('/server/allcollections/collectionid/:value',(req, res) => {

    let col_Id = BigInt(req.params.value);

    query_stmt = "SELECT * FROM `AllEbookCollections` WHERE `Collection ID` = ?";
    db.query(query_stmt, [col_Id], (err, result) => {
        if(err) {
            console.log(err)
            res.sendStatus(400);
        } else {
            res.status(200).send(result);
        }
    })
})


// Delete a value from all e-collections
app.delete('/server/allcollections-delete/:value',(req, res) => {

    let col_Id = BigInt(req.params.value);

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


// All E-collection Edit 
app.post("/server/allcollections-edit", async (req, res) => {
    
    const oldID = BigInt(req.body["oldID"]);
    let dataUpdate = "";

    if ((req.body["namecheck"] === "on") & (req.body["ename"]!="")){
        let collectionName = req.body["ename"];
        collectionName = collectionName.replaceAll("\'","\\'");
        dataUpdate = dataUpdate + "`Collection Name`= '"+collectionName+"',";
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
        dataUpdate = dataUpdate + "`Perpetual?`= "+req.body["perpetual"]+",";
    }
    if(req.body["aggcheck"] === "on"){
        dataUpdate = dataUpdate + "`Aggregator?`= "+req.body["aggregator"]+",";
    }
    if(req.body["datasynccheck"] === "on"){
        dataUpdate = dataUpdate + "`Data Sync?`= "+req.body["datasync"]+",";
    }
    if(req.body["oacheck"] === "on"){
        dataUpdate = dataUpdate + "`OA?`= "+req.body["oa"]+",";
    }
    if(req.body["reclamationcheck"] === "on"){
        dataUpdate = dataUpdate + "`Reclamation?`= "+req.body["reclamation"]+",";
    }
    if(req.body["vendorcheck"] === "on"){
        dataUpdate = dataUpdate + "`Vendor`= '"+req.body["vendor"]+"',";
    }
    if(req.body["notecheck"] === "on"){
        let collectionNotes = req.body["enote"];
        collectionNotes = collectionNotes.replaceAll("\'","\\'");
        dataUpdate = dataUpdate + "`Note`= '"+collectionNotes+"',";
    }
    if(req.body["idcheck"] === "on"){
        dataUpdate = dataUpdate + "`Collection ID`="+req.body["eid"]+",";
    }
    if(req.body["pocheck"] === "on"){
        dataUpdate = dataUpdate + "`PO Linked?`="+req.body["po"]+", ";
    }
    if(req.body["lendablecheck"] === "on"){
        dataUpdate = dataUpdate + "`Lendable Note`='"+req.body["lendable"]+"' ";
    }
    
    try {
        db.query("UPDATE `AllEbookCollections` SET "+dataUpdate.slice(0,-1)+" WHERE `Collection ID` = "+oldID, (err, result) => {
            if (err){
                console.log(err);
                return res.status(400).send({ code: err.code, message: err.sqlMessage });
            }
        });

    } catch (err) {
        console.log(err);
        return res.sendStatus(400);
    }

    res.status(200).send({"message":"Data Updated Successfully"});

})


//Get all vendors name from VendorList
app.get('/server/vendors-name',(req, res) => {
    db.query("SELECT `Vendor Name` FROM VendorList", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all vendors
app.get('/server/vendors',(req, res) => {
    db.query("SELECT * FROM VendorList", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Select a value from all vendors
app.get('/server/vendors/vendorid/:value',(req, res) => {

    let col_Id = (req.params.value);

    query_stmt = "SELECT * FROM `VendorList` WHERE `Vendor ID` = ?";
    db.query(query_stmt, [col_Id], (err, result) => {
        if(err) {
            console.log(err)
            res.sendStatus(400);
        } else {
            res.status(200).send(result);
        }
    })
})

// Get all vendors-delete
app.delete('/server/vendors-delete/:value', async (req, res) => {
    let data = req.params.value;
    let vendorId = BigInt(data.split("&")[0]);
    let vendorName = data.split("&")[1];
    db.query("DELETE FROM `VendorList` WHERE `Vendor Name` = ? AND `Vendor ID` = ?", [vendorName, vendorId], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

// Add Vendor Item
app.post('/server/vendors-add',(req, res) => {
    var { vendorId, vendorName, vendorWeb, userName, password, note, contact } = req.body;
    vendorName = vendorName.replaceAll("\'","\\'");
    note = note.replaceAll("\'","\\'");
    
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
app.post("/server/vendors-edit", (req, res) => {
    
    const oldID = req.body["oldID"];
    let dataUpdate = "";

    if ( (req.body["idcheck"] === "on")) {
        dataUpdate = dataUpdate + "`Vendor ID`='"+req.body["vendorId"]+"',";
    }

    if ( (req.body["namecheck"] === "on") & (req.body["vendorName"]!="") ) {
        var vName = req.body["vendorName"];
        vName = vName.replaceAll("'","\'");
        dataUpdate = dataUpdate + "`Vendor Name` = '"+vName+"',";
    }

    if ((req.body["webcheck"] === "on") ){
        const web = req.body["vendorWeb"];
        dataUpdate = dataUpdate + "`Vendor Web`= '"+web+"',";
    }
    
    if ((req.body["usernamecheck"] === "on")){
        const userName = req.body["userName"];
        dataUpdate = dataUpdate +"`Vendor Web UserName`= '"+ userName+"',";
    }

    if ((req.body["pwdcheck"] === "on")) {
        const password = req.body["password"];
        dataUpdate = dataUpdate +"`Vendor Web PWD`= '"+password+"',";
    }

    if (req.body["notecheck"] === "on"){
        var note = req.body["vendornote"];
        note = note.replaceAll("\'","\\'");
        dataUpdate = dataUpdate +"`Note`= '"+note+"',";
    }

    if ((req.body["contactcheck"] === "on")) {
        const contact = req.body["contact"];
        dataUpdate = dataUpdate +"`Vendor Contact`= '"+contact+"',";
    }

    try {
        const resultData = db.query("UPDATE `VendorList` SET "+dataUpdate.slice(0,-1)+" WHERE `Vendor ID` = "+oldID, (err, result) => {
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


// Get all P Collections
app.get('/server/pcollections',(req, res) => {
    db.query("SELECT * FROM `973P-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all E Collections of 973
app.get('/server/ecollections',(req, res) => {
    db.query("SELECT CAST(`CollectionID` AS VARCHAR(25)) AS `CollectionID`, `973Value`, `973inAllBIB`, `973NormRule`, `IZOnly?`, `Note` FROM `973E-CollectionName`", (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// Get all 973 Collections
app.get('/server/all973collections',(req, res) => {
    sql = "SELECT `CollectionName`, 'P' AS `P/E` FROM `973P-CollectionName` Union SELECT `973Value` AS `CollectionName`, 'E' AS `P/E` FROM `973E-CollectionName` Order by `CollectionName`";
    db.query( sql, (err, result) => {
        if(err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})


// Select a value from all ecollections
app.get('/server/ecollections/collectionid/:value',(req, res) => {

    let col_Id = (req.params.value);

    query_stmt = "SELECT * FROM `973E-CollectionName` WHERE `973Value` = ?";
    db.query(query_stmt, [col_Id], (err, result) => {
        if(err) {
            console.log(err)
            res.sendStatus(400);
        } else {
            res.status(200).send(result);
        }
    })
})

// Update E Collection Item of 973
app.post('/server/ecollections-edit', (req, res) => {

    // Id is Name
    const oldID = req.body["oldID"];
    let dataUpdate = "";

    if ( (req.body["namecheck"] === "on") & (req.body["e973name"]!="") ) {
        var eName = req.body["e973name"];
        eName = eName.replaceAll("\'","\\'");
        dataUpdate = dataUpdate + "`973Value`= '"+eName+"',";
    }

    if ((req.body["bibcheck"] === "on") & (req.body["e973bib"]!=3) ){
        const bib = req.body["e973bib"];
        dataUpdate = dataUpdate + "`973inAllBIB`= '"+bib+"',";
    }
    
    if ((req.body["nrcheck"] === "on") & (req.body["e973nr"]!=3) ){
        const nr = req.body["e973nr"];
        dataUpdate = dataUpdate + "`973NormRule`='"+nr+"',";
    }

    if ((req.body["izcheck"] === "on") & (req.body["e973iz"]!=3)) {
        const iz = req.body["e973iz"];
        dataUpdate = dataUpdate + "`IZonly?`="+iz+",";
    }

    if (req.body["notecheck"] === "on"){
        var note = req.body["e973note"];
        note = note.replaceAll("\'","\\'");
        dataUpdate = dataUpdate + "`Note`='"+note+"',";
    }

    if(req.body["idcheck"] === "on"){
        dataUpdate = dataUpdate + "`CollectionID`="+req.body["e973id"]+",";
    }

    try {
        const resultData = db.query("UPDATE `973E-CollectionName` SET "+dataUpdate.slice(0,-1)+" WHERE `973Value` = \""+oldID+"\"", (err, result) => {
            if(resultData) { 
                res.status(200).send({"message":"Data Updated Successfully"})
            }
        });

    } catch (err) {
        console.log(err);
        if (err instanceof APIError) {
            return res.status(err.status).send({ code: err.code, message: err.message });
        } else {
            return res.sendStatus(400);
        }
    }

})

// Delete E Collection Item of 973
app.delete('/server/ecollections-delete/:value', async (req, res) => {
    let e973Val = req.params.value;
    db.query("DELETE FROM `973E-CollectionName` WHERE `973Value` = ?", [e973Val], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

// Add E Collection Item of 973
app.post('/server/ecollections-add', async (req, res) => {
    
    const e973id = BigInt(req.body["e973id"]);
    var eName = req.body["e973name"];
    const bib = req.body["e973bib"];
    const nr = req.body["e973nr"];
    const iz = req.body["e973iz"];
    let note =  req.body["e973note"];

    eName = eName.replaceAll("\'","\\'");
    note = note.replaceAll("\'","\\'");

    let sql_query = "INSERT INTO `973E-CollectionName`(`CollectionID`,`973Value`,`973inAllBIB`,`973NormRule`,`IZonly?`,`Note`) SELECT `CollectionID`,`973Value`,`973inAllBIB`,`973NormRule`,`IZonly?`,`Note` FROM (SELECT "+e973id+" AS `CollectionID`, '"+eName+"' AS `973Value`, "+bib+" AS `973inAllBIB`, "+nr+" AS `973NormRule`, "+iz+" AS `IZonly?`, '"+note+"' as `Note`) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err);
        }else{
            res.sendStatus(200);
        }
    })
    
})

// Select a value from all pcoolections
app.get('/server/pcollections/collectionid/:value',(req, res) => {

    let col_Id = (req.params.value);

    query_stmt = "SELECT * FROM `973P-CollectionName` WHERE `CollectionName` = ?";
    db.query(query_stmt, [col_Id], (err, result) => {
        if(err) {
            console.log(err)
            res.sendStatus(400);
        } else {
            res.status(200).send(result);
        }
    })
})

// Update P Collection Item
app.post('/server/pcollections-edit', async (req, res) => {

    const oldID = req.body["oldID"];
    let dataUpdate = "";

    if ( (req.body["namecheck"] === "on") & (req.body["p973name"]!="") ) {
        var eName = req.body["p973name"];
        eName = eName.replaceAll("\'","\\'");
        dataUpdate = dataUpdate + "`CollectionName`='"+eName+"',";
    }
    
    if (req.body["notecheck"] === "on"){
        var note = req.body["p973note"];
        note = note.replaceAll("\'","\\'");
        dataUpdate = dataUpdate +"`Note`= '"+note+"',"; 
    }

    try {
        const resultData = db.query("UPDATE `973P-CollectionName` SET "+dataUpdate.slice(0,-1)+" WHERE `CollectionName` = \""+oldID+"\"", (err, result) => {
            if(resultData) { 
                res.status(200).send({"message":"Data Updated Successfully"})
            }
        });

    } catch (err) {
        console.log(err);
        if (err instanceof APIError) {
            return res.status(err.status).send({ code: err.code, message: err.message });
        } else {
            return res.sendStatus(400);
        }
    }

})

// Delete P Collection Item
app.delete('/server/pcollections-delete/:value', async (req, res) => {
    let name = req.params.value;
    db.query("DELETE FROM `973P-CollectionName` WHERE `CollectionName` = ?", [name], (err, result) => {
        if(err) {
            console.log(err);
        }
    })
    res.sendStatus(200);
})

// Add P Collection Item
app.post('/server/pcollections-add', async (req, res) => {

    var pName = req.body["p973name"];
    var note = req.body["p973note"];
    pName = pName.replaceAll("\'","\\'");
    note = note.replaceAll("\'","\\'");

    let sql_query = "INSERT INTO `973P-CollectionName`(`CollectionName`,`Note`) SELECT `CollectionName`,`Note` FROM (SELECT '"+pName+"' AS CollectionName, '"+note+"' as Note) AS dataSet1";

    db.query(sql_query, (err, result) => {
        if(err) {
            console.log(err);
        }else{
            res.sendStatus(200);
        } 
    })
    
})

// Get Alma Details
app.post('/server/search-alma-api/', async (req, res) => {
   
    let { almaid } = req.body;
    let collectionId = almaid;
    
    let alma_url = "https://sddmecbcll.execute-api.us-west-2.amazonaws.com/almaws/v1/electronic/e-collections/"+collectionId+"?apikey="+API_TOKEN;
    let service_alma_url = "https://sddmecbcll.execute-api.us-west-2.amazonaws.com/almaws/v1/electronic/e-collections/"+collectionId+"/e-services?apikey="+API_TOKEN;

    try {
        const responseAlma = await axios.get(alma_url);
        const responseService = await axios.get(service_alma_url);
        
        responseAlmaData = responseAlma.data;
        responseServiceData = responseService.data;

        var obj = new Object();
        obj.name = responseAlmaData.public_name;
        obj.numport = responseAlmaData.portfolios.value;

        if (responseAlmaData.access_type.value == "current") {
            obj.perp="N";
        } else{
            obj.perp="Y";
        };

        if (responseAlmaData.type.value == "0") {
            obj.aggre="N";
        } else{
            obj.aggre="Y";
        };

        if (responseAlmaData.free.value == "0") {
            obj.free="N";
        } else{
            obj.free="Y";
        };

        if (responseAlmaData.is_local != true) {
            obj.iz ="N";
        } else{
            obj.iz ="Y";
        };
        if (responseAlmaData.proxy_enabled.value == "false") {
            obj.proxy="N";
        } else{
            obj.proxy = "Y";
        };

        if (responseAlmaData.cdi_info == {}) {
            obj.cdi ="N";
        } else{
            obj.cdi = "Y";
        };

        obj.po = responseAlmaData.po_line.value;
        obj.interface = responseAlmaData.interface.name;
        obj.internal_des = responseAlmaData.internal_description;
        obj.pub_note = responseAlmaData.public_note;
        obj.des = responseAlmaData.description;

        obj.sernum = responseServiceData.electronic_service.length;
        obj.serviceData = [];
        let counter =0;
        var serviceData = new Object();

        while(counter < obj.sernum) {
            if(responseServiceData.electronic_service[counter].activation_status.desc == "Available") {
                serviceData.servail = "Y";
            } else {
                serviceData.servail = "N";
            }

            serviceData.serdes = responseServiceData.electronic_service[counter].public_description;
            serviceData.sernum = responseServiceData.electronic_service[counter].portfolios.value;

            obj.serviceData.push(serviceData);
            serviceData = new Object();
            counter+=1;
        }

        let data = JSON.stringify(obj);
        return res.status(200).send(data);
    } catch (err) {
        console.log(err);
        if (err instanceof APIError) {
            return res.status(err.status).send({ code: err.code, message: err.message });
        } else {
            return res.sendStatus(400);
        }
    }
        

})

app.get('/server/', function(req, res){
    res.send("Hello from the root application URL");
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=>{
   console.log("server running on 3001"); 
});

