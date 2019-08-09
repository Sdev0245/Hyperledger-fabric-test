const express = require('express');
const bcrypt = require('bcryptjs');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}));
const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet,Gateway,X509WalletMixin } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

 app.post('/signup',async (req,res,next)=>{
   console.log(req. body);
      try{  const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACertsPath = path.resolve(__dirname, '..', caInfo.tlsCACerts.path);
        const caTLSCACerts = fs.readFileSync(caTLSCACertsPath);
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
     const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
       const adminExists = await wallet.exists('admin');


        if (!adminExists) {
        	 const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const identity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
        await wallet.import('admin', identity);

   res.status(500).json({message :"successfully enrolled admin now try signup again"});
        }
    
  
 const gateway = new Gateway();

        await gateway.connect(ccpPath, { wallet, identity:'admin', discovery: { enabled: true, asLocalhost: true } });

        
        const ca1 = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        
        const secret = await ca1.register({ affiliation: 'org1.department1', enrollmentID: req.body.user, role: 'client' }, adminIdentity);
        const enrollment = await ca1.enroll({ enrollmentID: req.body.user, enrollmentSecret: secret });
        const userIdentity = X509WalletMixin.createIdentity(req.body.org, enrollment.certificate, enrollment.key.toBytes());
         await wallet.import(req.body.user, userIdentity)
        res.status(201).JSON({message:"successfully registered user",privatekey:userIdentity.privatekey})

   
       }

       catch(err) {

       	res.status(500).json({message :"error not able to wrork"})
       }

 })


app.get('/queryAllCars',async(req,res,next) =>{




	 const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user22');
        if (!userExists) {
            console.log('An identity for the user "user1" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'user22', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // Evaluate the specified transaction.
        // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
        // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
        const result = await contract.evaluateTransaction('queryAllCars');
        res.json({result:result});
})


app.listen(8000);