# Getting Started with Metadata Backend App

### Running on Local
1. Start Client After this Server. (<a href="https://github.com/sheetalrprasad/E_Collection_Metadata_V2_Client">Client</a>)
1. Install Node and NPM (https://nodejs.org/en/download)
2. Clone this project
3. In the project directory, create .env file and add all variables required
4. Check installation    
    `node -v`   
    `npm -v`
5. Go to the project directory in the terminal
6. Run `npm install` or `npm i` to install on dependency
7. Run command `node index.js`

### Changes for Production/Local
1. Once the code is ready for deployment, change the whitelist URL in file: `index.js` to reflect the URL where the backend is deployed and the frontend URL
3. For local keep it `http://localhost:PORT`
4. Backend PORT is assigned `3001` and frontend port is `3000`


### Adding Columns
1. Once the columns is added in the MySQL, Add the column name to `GET`/`PUT`/`POST` calls to reflect the same.
2. If the datatype is BigInt, receive the data as a `CAST` or send as `BigInt` to have the correct data.