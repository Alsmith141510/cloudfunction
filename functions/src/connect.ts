import * as functions from 'firebase-functions';
import { stripe } from './config'; 
import { getTeacher, updateTeacherStripeAccountId, updateTeacherStripeOnboardingStatus } from './customers';
// import * as corsModule from "cors";
// const cors = corsModule({ origin: true });
export const onboardingTeacher = async(uid: string) => {
    const resp = {accountLink : "", error : ""};

    try {       
        
        // Create account
        let teacher:any;
        const tch = await getTeacher(uid);
        // tch.forEach((doc: { data: () => any; }) => {
        //     teacher = doc.data();        
        // }); 
        teacher = tch.data;
        //console.log(teacher);
        if(teacher.exists){
            const account = await stripe.accounts.create({
                type: 'express',
                business_type: 'company',
                individual:{
                    email:teacher.teacherEmail,
                    first_name: teacher.teacherName.split(' ')[0],
                    last_name: teacher.teacherName.split(' ')[1],
                    dob:{day:teacher.dob.split('/')[2],month:teacher.dob.split('/')[1],year:teacher.dob.split('/')[0]},
                    phone:teacher.teacherPhone,
                    metadata: { firebaseUID: uid }
                },        
                requested_capabilities: ['card_payments', 'transfers'],
                mcc: 8299
            });
            await updateTeacherStripeAccountId(uid,account.id);
            resp.accountLink = await stripe.accountLinks.create({
                account: account.id,
                success_url: 'http://localhost:4200/stripeKyc?success&accountid='+ uid,
                failure_url: 'http://localhost:4200/stripeKyc?success&accountid='+ uid,
                type: 'account_onboarding',
                collect: 'eventually_due'
            });
            return resp;
        } else {
            console.log(err);
            resp.error = err;
            return resp;
        }

        
    } catch (err) {
      console.log(err);
      resp.error = err;
      return resp;
    }
    return resp;
}


export const expressOnboardingTeacher = async(data: any) => {
    const resp = {accountLink : "", error : ""};
    const teacherId = data.teacherId

   let account: any;
    // const teacherid = data.teacherId
    // const accountid = data.accountID
   // Create account
   let teacher:any;
   const tch = await getTeacher(teacherId);
    // tch.forEach((doc: { data: () => any; }) => {
    //         teacher = doc.data();        
    //     }); 
    console.log('getTeacher->' +JSON.stringify(tch.data));

    if (tch.exists) {
        teacher = tch.data();   
        console.log("Hello from info. Here's teacher object:", teacher);
        const emailt = teacher.teacherEmail;
        console.log(' teacher:::' + emailt);
        try {
                account = await stripe.accounts.create({
                    country: 'US',
                    type: 'express',
                    email: emailt,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                });
                resp.accountLink = account.id;
                // resp.error = err
                console.log('Create account API succeded for teacher' + account.id);
               // return resp;
            } catch (err) {
                resp.accountLink = 'Create account API failed for teacher';
                resp.error = err;
                console.log('Create account API failed for teacher');
                return resp;
            }
    } else {
        resp.error = `Teacher id ${teacherId} does not exist`
        return resp;
    }
    console.log(' create account completed');
   try {
        await updateTeacherStripeAccountId(teacherId, account.id);
    } catch {
        console.log('database update failed for teacher');
        return resp;
    }
    console.log(' Update account in the database completed');
    let status =  true;
    try {
        resp.accountLink = await stripe.accountLinks.create({
        //     account: teacherId, commented 5/29by rshetty
            account: account.id,
            refresh_url: 'http://localhost:4200/stripeKyc?success&accountid='+ account.id + '&teacherId=' + teacherId +'&resp=' + resp,
            return_url: 'http://localhost:4200/stripeKyc?success&accountid='+ account.id +'&teacherId=' + teacherId +'&resp=' + resp,
            type: 'account_onboarding',
        //  collect: 'eventually_due'
        });
        await updateTeacherStripeOnboardingStatus(teacherId,status);
        return resp;
    } catch (err) {
        console.log(err);
        resp.error = err;
        status = false;
        await updateTeacherStripeOnboardingStatus(teacherId,status);
        return resp;
    } 
}
// Deployeable functions
export const stripeOnBoardingTeacher = functions.https.onRequest( async (request, response) => {
    //const uid = assertUID(context);
    // file deepcode ignore XSS: <please specify a reason of ignoring this>, file deepcode ignore ServerLeak: <please specify a reason of ignoring this>
    response.send(await onboardingTeacher(request.body.teacherid));
});

export const stripeOnBoardingTeacherStatusUpdate = functions.https.onRequest( async (request, response) => {
    //const uid = assertUID(context);
    console.log(request.body);
    const sts = request.body.success !== undefined ? true : false;
    response.send(await updateTeacherStripeOnboardingStatus(request.body.teacherid,sts) );
});

export const stripeExpressOnBoardingTeacher = functions.https.onRequest( async (request, response) => {
    //const uid = assertUID(context);
    // file deepcode ignore XSS: <please specify a reason of ignoring this>, file deepcode ignore ServerLeak: <please specify a reason of ignoring this>

    // cors(request, response, async () => {
    //     response.send(await expressOnboardingTeacher(request.body));
    //   });
   response.send(await expressOnboardingTeacher(request.body));
});

export const stripeExpressOnBoardingTeacherStatusUpdate = functions.https.onRequest( async (request, response) => {
    //const uid = assertUID(context);
    console.log(request.body);
    const sts = request.body.success !== undefined ? true : false;
    response.send(await updateTeacherStripeOnboardingStatus(request.body.teacherid,sts) );
});

export const stripeExpressOnBoardingRetrieve = functions.https.onRequest( async (request, response) => {
    //const uid = assertUID(context);
    console.log(request.body);
    const sts = request.body.success !== undefined ? true : false;
    response.send(await updateTeacherStripeOnboardingStatus(request.body.teacherid,sts) );
});