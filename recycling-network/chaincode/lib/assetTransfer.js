'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {
    

    // CreateAsset issues a new asset with given details (only manufacturer)
    async CreateAsset(ctx, manufacturerCode, registrationNumber, serialNumber) {
        
        const ctxEmitter = await this.GetTxEmmiter(ctx)
        if(ctxEmitter != "ManufacturerMSP") {
            throw new Error("Only a Manufacturer can create a new asset")
        }
        
        const exists = await this.AssetExists(ctx, serialNumber);
        if (exists) {
            throw new Error(`The asset ${serialNumber} already exists`);
        }

        const asset = {
            ManufacturerCode: manufacturerCode,
            RegistrationNumber: registrationNumber,
            SerialNumber: serialNumber,
            State: "manufactured",
        };
        
        await ctx.stub.putState(serialNumber, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset
    async ReadAsset(ctx, serialNumber) {
        const assetJSON = await ctx.stub.getState(serialNumber); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }
        return assetJSON.toString()
    }
  
    // updates asset state to "sold"(only distributor)
    async UpdateAssetStateSold(ctx, manufacturerCode, registrationNumber, serialNumber) {
        
        const ctxEmitter = await this.GetTxEmmiter(ctx)
        if(ctxEmitter != "DistributorMSP") {
            throw new Error("Only a Distributor can change to Sold state")
        }

        const exists = await this.AssetExists(ctx, serialNumber);
        if (!exists) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }        

        const updatedAsset = {
            ManufacturerCode: manufacturerCode,
            RegistrationNumber: registrationNumber,
            SerialNumber: serialNumber,
            State: "sold",
        }

        return ctx.stub.putState(serialNumber, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // updates asset state to "received"(only center)
    async UpdateAssetStateReceived(ctx, manufacturerCode, registrationNumber, serialNumber) {
        
        const ctxEmitter = await this.GetTxEmmiter(ctx)
        if(ctxEmitter != "CenterMSP") {
            throw new Error("Only a Center can change to Sold state")
        }

        const exists = await this.AssetExists(ctx, serialNumber);
        if (!exists) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }        

        const updatedAsset = {
            ManufacturerCode: manufacturerCode,
            RegistrationNumber: registrationNumber,
            SerialNumber: serialNumber,
            State: "received",
        }

        return ctx.stub.putState(serialNumber, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // updates asset state to "recycled"(only center)
    async UpdateAssetStateRecycled(ctx, manufacturerCode, registrationNumber, serialNumber) {
        
        const ctxEmitter = await this.GetTxEmmiter(ctx)
        if(ctxEmitter != "CenterMSP") {
            throw new Error("Only a Center can change to Sold state")
        }

        const exists = await this.AssetExists(ctx, serialNumber);
        if (!exists) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }        

        const updatedAsset = {
            ManufacturerCode: manufacturerCode,
            RegistrationNumber: registrationNumber,
            SerialNumber: serialNumber,
            State: "recycled",
        }

        return ctx.stub.putState(serialNumber, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }


    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, serialNumber) {
        const exists = await this.AssetExists(ctx, serialNumber);
        if (!exists) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }
        return ctx.stub.deleteState(serialNumber);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, serialNumber) {
        const assetJSON = await ctx.stub.getState(serialNumber);
        return assetJSON && assetJSON.length > 0;
    }
    
    //GetTxData returns the transaction emitter name
    async GetTxEmmiter(ctx) {
        return ctx.clientIdentity.getMSPID();
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}



module.exports = AssetTransfer;
