'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {
    

    // CreateAsset issues a new asset with given details
    async CreateAsset(ctx, manufacturerCode, registrationNumber, serialNumber) {
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
        const assetJSON = await ctx.stub.getState(serialNumber); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }
        return JSON.parse(assetJSON) //toString()
    }

    // UpdateAsset updates an existing asset 
    
    async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    async UpdateAssetStateSold(ctx, serialNumber) {
        
        const ctxEmitter = await this.GetTxEmmiter(ctx)
        if(ctxEmitter != "DistributorMSP") {
            throw new Error("Only a distributor can change to Sold state")
        }

        const exists = await this.AssetExists(ctx, serialNumber);
        if (!exists) {
            throw new Error(`The asset ${serialNumber} does not exist`);
        }

        const assetJSON = await ctx.stub.getState(serialNumber);

        const updatedAsset = {
            ManufacturerCode: assetJSON.manufacturerCode,
            RegistrationNumber: assetJSON.registrationNumber,
            SerialNumber: serialNumber,
            State: "sold",
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
