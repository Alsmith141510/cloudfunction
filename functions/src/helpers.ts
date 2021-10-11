import * as functions from 'firebase-functions';
import { server } from './config'; 

/**
Validates data payload of a callable function
*/
export const assert = (data: any, key:string) => {
    console.log('assert'+ data)
    if (!data[key]) {
        console.log('calling the function and has invalid arguments' + data[key]);
        throw new functions.https.HttpsError('invalid-argument', `function called without ${key} data`);
    } else {
        console.log('Data Key' + data[key]);
        return data[key];
    }
}

/**
Validates auth context for callable function 
*/
export const assertUID = (context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('permission-denied', 'function called without context.auth');
    } else {
        return context.auth.uid;
    }
}

/**
Sends a descriptive error response when running a callable function
*/
export const catchErrors = async (promise: Promise<any>) => {
    try {
        return await promise;
    } catch(err) {
        throw new functions.https.HttpsError('unknown', err)
    }
}

// get current date time
export const getDateTimeObj = async() => {
    return server.firestore.Timestamp.fromDate(new Date());
}

// get current date time
export const getDateTime = async(retType:string = "str") => {
    return getDateTimeObj.toString();
}

export const generateGUID = async() => {
    let uid = await getDateTime();
    uid = uid.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
    return uid;
 }