import { db } from './config'; 

// get taParam
export const getParamDataByDate = async(currentTimeStamp: any) => {
    const taParamRef = db.collection('taParam');
    let ret:any;
    let obj = {'error':true,'message':'something happend', 'data':''}
    const snapshot = await taParamRef.where('paramName', '==', 'IsCampaignDay').get();
    if (snapshot.empty) {
        console.log('Cannot use the voucher during Campaigns');
        obj = {'error':true,'message':'Cannot use the voucher during Campaigns', 'data':''};
    } 

    snapshot.forEach(doc => {
        ret = doc.data();        
    }); 
    
    if(ret && ret.paramValue === true && ret.startDate.valueOf() <= currentTimeStamp.valueOf() && ret.endDate.valueOf() >= currentTimeStamp.valueOf())
    {
        obj = {'error':true,'message':'Cannot use the voucher during Campaigns', 'data':''};
    } else {
        obj = {'error':false,'message':'', 'data':ret};
    }

    return obj;    
}

// get coupon by code
export const getActiveCouponByCode = async(code: string) => {
    const couponsRef = db.collection('coupons');
    let ret;
    const snapshot = await couponsRef.where('Id', '==', code).where('isActive', '==', 'Y').get();
    if (snapshot.empty) {
        console.log('Invalid voucher or voucher expired');
        return {'error':true,'message':'Invalid voucher or voucher expired'};
    }  
    snapshot.forEach(doc => {
        ret = doc.data();
    });
    
    return {'error':false,'message':'', 'data':ret};
}