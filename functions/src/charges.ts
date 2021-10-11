import * as functions from "firebase-functions";
import { assert, assertUID, getDateTimeObj } from "./helpers";
import { db, stripe } from "./config";
import {
  getCoursePayment,
  getCustomer,
  getUser,
  saveCoursePayment,
  saveTransactions,
} from "./customers";
import { getActiveCouponByCode, getParamDataByDate } from "./coupon";
import * as corsModule from "cors";


const cors = corsModule({ origin: true });

/**
Gets a user's charge history
*/
export const getUserCharges = async (uid: string, limit?: number) => {
  const customer = await getCustomer(uid);

  return await stripe.charges.list({
    limit,
    customer,
  });
};

/**
 * Helper function to update a payment record in Cloud Firestore.
 */

 const handlePaymentIntentConfirm = async (data: any) => {
  const paymentIntentConfirm = await stripe.paymentIntents.create({
    amount: data.totalAmount * 100,
    currency: "usd",
    payment_method_types: ["card"],
    payment_method: JSON.parse(data.source).id,
    confirm: false,
    off_session: false,
    metadata: { user_id: data.userId },
  });

    // function (err: { message: any; }, paymentIntent: any) {
    // if (err) {
    //   return { error: err.message};
    // } else {
      return { paymentIntent: paymentIntentConfirm };
    // }
  // }
  // );
 }

const handlePaymentIntent = async (data: any) => {
  //const _user = await getUser(data.userId);

  // Create a PaymentIntent:
  // changing confirm to retrieve
  let paymentIntent = await stripe.paymentIntents.retrieve(
    data.paymentIntentId);
    // ,
    // {payment_method: JSON.parse(data.source).id},
    // {confirm: true});

//    if (paymentIntent.status === 'succeeded')
  //   ,
  //   {
  //   amount: data.totalAmount * 100,
  //   currency: "usd",
  //   payment_method_types: ["card"],
  //   payment_method: JSON.parse(data.source).id,
  //   confirm: true, // if true is used during creation/update], it is equivalent to creating and confirming the PaymentIntent in the same call. 
  //   off_session: false,
  //   metadata: { user_id: data.userId },
  // }
  let trans: any;
  if (paymentIntent.status === "requires_capture") {
    paymentIntent = await stripe.paymentIntents.capture(paymentIntent.id);
  }
  if (paymentIntent.status === "succeeded") {
     trans = await createAndSaveCoursePaymentObject(
      paymentIntent.charges.data[0].amount,
      data.Cart,
      data.userId,
      paymentIntent.id,
      true,
      paymentIntent
    );
  }
  // const trans = await saveTransactions(paymentIntent);

  return { paymentIntent: paymentIntent, transaction: trans };
};

const getProductsFromCart = async (data: any) => {
  // const id: any = [];
  // const name: any = [];
  const courseData: any = [];
  
  data.forEach((_cartItem: any) => {
    // id.push(_cartItem.courseId);
    // name.push(_cartItem.name);
    const ret = {courseId: _cartItem.courseId, name: _cartItem.name}
    courseData.push(ret);
  });
 // return { id: id, name: name };
  return courseData;
};


const getcourseStudentTeacher = async (userId: string, cartdata: any) => {
  let courseMessageData: any = [];
  let teacherInfo: any = [];
  let studentInfo: any = [];
  let recStudent: any = [];
  // let recMessageData: any = [];

  const user = await getUser(userId);
  
  console.log('user:' + JSON.stringify(user));

  recStudent.id = assert(user, "uid");
  recStudent.email = assert(user, "email");
  recStudent.Username = assert(user, "displayName");
  // console.log('recStudent:' + JSON.stringify(recStudent));

  studentInfo = {
    id: recStudent.id,
    email: recStudent.email,
    name: recStudent.Username
  }

  console.log('studentInfo:' + JSON.stringify(studentInfo));

  console.log('before looping cartdata:' + JSON.stringify(cartdata));
  cartdata.forEach((_cartItem: any) => {
    console.log('Inside cart Foreach cart rec:' + JSON.stringify(_cartItem));
    const courseID = _cartItem.courseId;
    const courseName = _cartItem.name;
    const recTeacher: any = [];
    console.log('cart rec:courseID -- -' + JSON.stringify(courseID));
     _cartItem.teachers.forEach((_Teacher: any) => {
      // tslint:disable-next-line:ban-comma-operator
         recTeacher.email = _Teacher.googleid,
         recTeacher.id = _Teacher.teacherId,
         recTeacher.name = _Teacher.teacherName ;
        console.log('recTeacher:' + _Teacher.googleid +' :: ' + _Teacher.teacherId +' :: ' + _Teacher.teacherName);
    });
    teacherInfo = {
      id: recTeacher.id,
      email: recTeacher.email,
      name: recTeacher.name
    };
    console.log('teacherInfo:' + JSON.stringify(teacherInfo));

    courseMessageData = {
      courseID: courseID,
      courseName: courseName,
      student: studentInfo,
      teacher: teacherInfo
    };
  });
  return courseMessageData;
}
const createAndSaveCoursePaymentObject = async (
  amount: number,
  cartData: any,
  userId: string,
  intentId: any,
  isPaid: boolean,
  paymentIntent: any
) => {

/* Consolidate input data. */
  const Jdata: any = await getProductsFromCart(cartData);
  const invoiceId =  'inv' + intentId.substring(3,intentId.length);
  const id = 'cp_' + intentId;
  console.log('Jdata from Cart: ' + JSON.stringify(Jdata));
/* coursePayment arrays*/
  const coursePayments = {
    AmountPaid: "$" + amount / 100,
    Created: Date.now(),
    Lastupdated: Date.now(),
    Invoiceid: invoiceId ,
    TAOBJ: Jdata,
    UID: userId,
    id: id,
    isPaid: isPaid,
  };

  console.log('coursePayments: ' + JSON.stringify(coursePayments));

   const coursePurchased: { UID: string; courseId: any; courseName: any; invoiceId: string; status: boolean; transactionId: string; }[] = [];
   Jdata.forEach((Item: { courseId: any; name: any; }) => {
   const ret = { UID: userId,
      courseId: Item.courseId,
      courseName: Item.name,
      invoiceId: invoiceId,
      status: isPaid,
      transactionId: id}
      coursePurchased.push(ret);
  });
  console.log('coursePurchased: ' + JSON.stringify(coursePurchased));
  console.log('courseStripeTransactions: ' + JSON.stringify(paymentIntent));
 
    const pid = paymentIntent.id
    console.log('pid:::' + pid);
    const cpayret = await db.collection('coursePayments').doc(pid).set(coursePayments);
    console.log('coursePayments Complete' + cpayret.writeTime);

    coursePurchased.forEach(async (cpRec) => {
      // tslint:disable-next-line:no-shadowed-variable
      const cpurret = await db.collection('coursePurchased').doc().set(cpRec);
      console.log('coursePurchased Complete' + cpurret.writeTime);
    })

     
    const cstripe = await db.collection("courseStripeTransactions").doc(pid).set( paymentIntent);
    console.log('courseStripeTransactions Complete' + cstripe.writeTime);

    // const courseteacherMessage: { courseId: any; Student: any; teacher: string; status: boolean; }[] = [];
    /* courseMessage arrays*/
    // console.log('teacherMessageArray data' + JSON.stringify(teacherMessageArray));
    // const courseteacherMessage = {
    //   courseId: teacherMessageArray.courseId,
    //   student: teacherMessageArray.studentRec,
    //   teacher: teacherMessageArray.teacherRec,
    //   status: 'Active'};
    //   console.log('courseteacherMessage data' + JSON.stringify(courseteacherMessage));
    const messagedata: any = await getcourseStudentTeacher(userId, cartData);
    console.log('messagedata final: ' + JSON.stringify(messagedata));
    const courseteacherMessageResult = await db.collection("teacherStudentMessaging").doc(pid).set(messagedata);

    console.log('courseteacherMessage final: ' + JSON.stringify(courseteacherMessageResult));

  return 'completed';

/* try{
  const batch = db.batch();
  console.log('Setting batch for PAyment: ');
  const coursePaymentRef = db.collection('coursePayments').doc();
  // `${invoiceId}`
  console.log('Setting batch for PAyment: ' + coursePaymentRef );
  const retbatch1 = batch.set(coursePaymentRef, coursePayments);
  console.log('Setting batch for PAyment: ' + retbatch1);

  console.log('Setting batch for Purchase: ');
  const coursePurchasedRef = db.collection('coursePurchased').doc();
  const retbatch2 = batch.set(coursePurchasedRef, coursePurchased);
  console.log('Setting batch for Purchase: ' + retbatch2);
  
  console.log('Setting batch for courseStripeTransactions: ');
  const courseStripeRef = db.collection("courseStripeTransactions").doc();
  const retbatch3 = batch.set(courseStripeRef, paymentIntent);
  console.log('Setting batch for stripe: ' + retbatch3);
//  const courseMessageRef = db.collection("courseMessage").doc("id");
//  batch.set(courseMessageRef, courseMessage); 
  console.log('going to Commit: ');
  return await batch.commit()
              .then((data) => {
                console.log('Commit completed');
                Promise.resolve({data});
              })
              .catch(error => {
                console.log('Error during commit');
                {(error)};
              })
} catch {
  return Error;
} */
};

const handlePaymentIntentBeforeConfirm = async (data: any) => {
  const paymentIntent = stripe.paymentIntents.create(
  {
    amount: parseInt(data.amount),
    currency: "usd",
    payment_method_types: ["card"],
  });
  return paymentIntent;
}

const handlePaymentMethod = async (data: any) => {
  // create a payment method
  if (data === null || data.number === null) {
    // tslint:disable-next-line:no-parameter-reassignment
    // data = {
    //   number: "4242424242424242",
    //   exp_month: 3,
    //   exp_year: 2022,
    //   cvc: "314",
    // };
    console.error("handlePaymentMethod error - Card object is null");
    return 'Invalid Card';
  }
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: data,
  });
  return paymentMethod;
};

const handlePaymentIntentCapture = async (data: any) => {
  const paymentIntent = await stripe.paymentIntents.capture(data.id);
  //const paymentIntent = await stripe.paymentIntents.retrieve(data.id);
  await saveTransactions(paymentIntent);
  return paymentIntent;
};

const handleUpdateIntent = async (data: any) => {
  await stripe.paymentIntents.update(data.id, {
    payment_method: JSON.parse(data.source).id,
  });
  const paymentIntent = await handlePaymentIntentCapture(data);
  return paymentIntent;
};

const updatePaymentIntentFromWebHook = async (id: any) => {
  // Retrieve the payment object to make sure we have an up to date status.
  const paymentIntent = await stripe.paymentIntents.retrieve(id);
  if (paymentIntent.status === "succeeded") {
    const p_intent = "cp_" + paymentIntent.id;
    const _coursePayment = await getCoursePayment(p_intent);
    if (_coursePayment) {
      _coursePayment["amount"] = paymentIntent.charges.data[0].amount;
      _coursePayment["Lastupdated"] = Date.now();
      _coursePayment["isPaid"] = true;
      await saveCoursePayment(_coursePayment);
    }
  }
  return await saveTransactions(paymentIntent);
};

const handlePaymentRefund = async (data: any) => {
  const refund = await stripe.refunds.create({
    amount: data.amount,
    payment_intent: data.paymentId,
  });
  return refund;
};

// apply voucher on courses
const handleApplyVoucher = async (data: any, resp: any) => {
  let ret = {};
  const currentTimeStamp = await getDateTimeObj();
  const validCampaign = await getParamDataByDate(currentTimeStamp);
  //let cartObj = [];
  if (validCampaign.error) {
    ret = validCampaign;
  } else {
    const _coupon: any = await getActiveCouponByCode(data.couponCode);
    if (_coupon.error) {
      ret = _coupon;
    } else {
      //console.log(_coupon);
      data.cart.forEach((_cart: any, index: number) => {
        //console.log(_cart.courseId +"  ---  " + _coupon.data.CourseId);
        if (_cart.courseId === _coupon.data.CourseId) {
          let _discount = 0;
          if (_coupon.data.couponType === "Percentage") {
            //console.log("iin prctg");
            const prcnt = Number(_coupon.data.value);
            //console.log(prcnt);
            _discount = (prcnt / 100) * Number(_cart.price);
          } else {
            _discount = Number(_coupon.data.value);
          }

          _cart.discount = Number(_discount) ? Number(_discount) : 0;
          _cart.subtotal = Number(_cart.subtotal) - Number(_discount);
          //console.log(_cart);
          //console.log("index is below");
          //console.log(index);
        }
      });
      data["campaignId"] = _coupon.data.CampaignID;
      ret = data;
    }
  }
  resp.send({ data: ret });
};

/////// DEPLOYABLE FUNCTIONS ////////

export const stripeCreateCharge = functions.https.onCall(
  async (data, context) => {
    const uid = assertUID(context);
    // const uid = assert(data, 'uid');
    const source = assert(data, "source");
    const amount = assert(data, "amount");

    // Optional
    // const idempotency_key = data.itempotency_key;
    console.log("stripeCreateCharge - uid" + uid);
    console.log("stripeCreateCharge - source" + source);
    console.log("stripeCreateCharge - amount" + amount);

    // return createCharge(uid, source, amount, idempotency_key)
    //.catch((err) => {
    //console.log(err)
    // });
  }
);

export const stripePaymentIntentConfirm = functions.https.onRequest((request, response) => {
  cors (request, response,async () => {
    //const uid = assertUID(context);
    // file deepcode ignore XSS: <please specify a reason of ignoring this>
    response.send(await handlePaymentIntentConfirm(request.body));
  })
});


export const stripePaymentIntent = functions.https.onRequest((request, response) => {
  cors (request, response,async () => {
    //const uid = assertUID(context);
    // file deepcode ignore XSS: <please specify a reason of ignoring this>
    response.send(await handlePaymentIntent(request.body));
  })
});

export const stripePaymentIntentBeforeConfirm = functions.https.onRequest((request, response) => {
  cors (request, response,async () => {
    //const uid = assertUID(context);
    response.send(await handlePaymentIntentBeforeConfirm(request.body));
  })
});

export const stripePaymentMethod = functions.https.onRequest((request, response) => {
  cors (request, response,async () => {
    //const uid = assertUID(context);
    response.send(await handlePaymentMethod(request.body));
  })
});

export const stripePaymentIntentCapture = functions.https.onRequest(
  async (request, response) => {
    //const uid = assertUID(context);
    response.send(await handlePaymentIntentCapture(request.body));
  }
);

export const stripePaymentIntentUpdate = functions.https.onRequest(
  async (request, response) => {
    //const uid = assertUID(context);
    response.send(await handleUpdateIntent(request.body));
  }
);

export const stripePaymentRefund = functions.https.onRequest(
  async (request, response) => {
    //const uid = assertUID(context);
    response.send(await handlePaymentRefund(request.body));
  }
);

export const applyVoucher = functions.https.onRequest((request, response) => {
  //const uid = assertUID(context);

  cors(request, response, async () => {
    return handleApplyVoucher(request.body, response);
  });
});

/**
 * A webhook handler function for the relevant Stripe events.
 * @see https://stripe.com/docs/payments/handling-payment-events?lang=node#build-your-own-webhook
 */
export const handleWebhookEvents = functions.https.onRequest(
  async (req, resp) => {
    const relevantEvents = new Set([
      "payment_intent.succeeded",
      "payment_intent.processing",
      "payment_intent.payment_failed",
      "payment_intent.canceled",
    ]);

    let event;

    // Instead of getting the `Stripe.Event`
    // object directly from `req.body`,
    // use the Stripe webhooks API to make sure
    // this webhook call came from a trusted source
    try {
      event = stripe.webhooks.constructEvent(
        // req.rawBody,
        // req.headers["stripe-signature"],
        // functions.config().stripe.endpointSecret
      );
    } catch (error) {
      console.error("Webhook Error: Invalid Secret");
      resp.status(401).send("Webhook Error: Invalid Secret");
      return;
    }

    // deepcode ignore UsageOfUninitializedVariable: <please specify a reason of ignoring this>
    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "payment_intent.succeeded":
          case "payment_intent.processing":
          case "payment_intent.payment_failed":
          case "payment_intent.canceled":
            const id = event.data.object.id;
            await updatePaymentIntentFromWebHook(id);
            break;
          default:
            throw new Error("Unhandled relevant event!");
        }
      } catch (error) {
        console.error(
          "Webhook error for [${event.data.object.id}]",
          error.message
        );
        resp.status(400).send("Webhook handler failed. View Function logs.");
        return;
      }
    }

    // Return a response to Stripe to acknowledge receipt of the event.
    resp.json({ received: true });
  }
);
