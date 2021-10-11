import { assert } from "./helpers";
import { db, stripe } from "./config";

/**
  The double star indicats to vscode to show the help for the syntax when
  you hover over the fun anywhere in the code */

/*
Read the user document from Firestore
*/
export const getUser = async (uid: string) => {
//   deepcode ignore PromiseNotCaughtNode: <please specify a reason of ignoring this>
  return await db.collection("users")
    .doc(uid)
    .get()
    .then((doc) => doc.data());
};

/**
  The double star indicats to vscode to show the help for the syntax when
  you hover over the fun anywhere in the code */

/*
Read the user document from Firestore
*/
export const getCourse = async (courseId: string) => {
   console.log('getCourseID:::::' + `${courseId}`);
   const techercollect = db
    .collection('courseMaster')
    .doc(`${courseId}`) 
    .listCollections();
    

// db.settings({timestampsInSnapshots: true});

// const collection = db.collection('courseMaster')
//                      .doc(`${courseId}`) ;

// collection.get().then(snapshot => {

//   snapshot.forEach(doc => {

//     console.log( doc.data().teacher );    
//     console.log( doc.data().mail );

//   });

// });

    console.log('After then The teacher collection is:::' +JSON.stringify(techercollect));

    const collectionIds =  (await techercollect).map((col) => {
        const colid = col.id;
        console.log('After then The teacher collection is:::' +JSON.stringify(collectionIds));
        console.log('After then The teacher collection is:::' + colid);
        }
        );

    return { collections: collectionIds };

    // console.log('After then The teacher collection is:::' +JSON.stringify(techercollect));
    // techercollect
    // .then((teacher) => {
    //     // tslint:disable-next-line:no-shadowed-variable
    //     console.log('After then The teacher data is:::' +JSON.stringify(teacher));
    //     // tslint:disable-next-line:no-shadowed-variable
    //     teacher.forEach((teacher) => {
    //         // deepcode ignore PromiseNotCaughtNode: <please specify a reason of ignoring this>
    //         console.log('After foreach teacher data is:::' +JSON.stringify(teacher));
    //         teacher
    //             .get()
    //             .then((array) => {
    //                 array.docs.forEach((doc) => {
    //                     console.log('The teacher data is:::' + doc.data());
    //                     return doc.data();
    //                 });
    //             })
    //             .catch((error) => {  console.log('error in get course' + error) }); 
    //     });
    // })
    // .catch((error) => {  console.log('error in get course' + error) });
};

/**
Gets a customer from Stripe
*/
export const getCustomer = async (uid: string) => {
  console.log("getCustomer - " + uid);
  const user = await getUser(uid);
  return assert(user, "stripeCustomerID");
};

/**
Updates the user document non-destructively using merge
*/
export const updateUser = async (uid: string, data: Object) => {
  return await db.collection("users").doc(uid).set(data, { merge: true });
};

/**
Updates the teacher document non-destructively using merge
*/
export const updateTeacher = async (uid: string, data: Object) => {
  return await db.collection("teacher").doc(uid).set(data, { merge: true });
};

export const getTeacherInfo = async (uid: string, data: Object) => {
  return await db.collection("teacher").doc(uid).get();
};

/**
Takes a Firebase user and creates a Stripe customer account
*/
export const createCustomer = async (uid: any) => {
  const customer = await stripe.customers.create({
    metadata: { firebaseUID: uid },
  });

  await updateUser(uid, { stripeCustomerID: customer.id });

  return customer;
};

export const saveTransactions = async (data: any) => {
  return await db.collection("courseStripeTransactions").doc(data.id).set(data);
};

export const getTransactions = async (id: any) => {
  return await db
    .collection("courseStripeTransactions")
    .doc(id)
    .get()
    .then((doc) => doc.data());
};

/**
Read the stripe customer ID from firestore, or create a new one if missing
*/
export const getOrCreateCustomer = async (uid: string) => {
  const user = await getUser(uid);
  const customerId = user && user.stripeCustomerID;

  // If missing customerID, create it
  if (!customerId) {
    return createCustomer(uid);
  } else {
    return stripe.customers.retrieve(customerId);
  }
};

//#region Teacher

export const getTeacher = async (teacherId: string) => {
  const taParamRef = db.collection("teacher").doc(`${teacherId}`);
  // const taParamRef = db.collection('teacher/${teacherId}')
  // where('uid', '==', uid).
  return await taParamRef.get();
};

export const updateTeacherStripeAccountId = async (
  teacherId: string,
  accid: string
) => {
  return await db.collection("teacher").doc(`${teacherId}`).update({
    stripeCustomerID: accid,
  });
};

export const updateTeacherStripeOnboardingStatus = async (
  teacherId: string,
  status: boolean
) => {
  return await db.collection("teacher").doc(`${teacherId}`).update({
    onBoarded: status,
  });
};

//#endregion Teachers

// //#region  coursePayments
export const saveCoursePayment = async (data: any) => {
  return await db.collection("coursePayments").doc(data.id).set(data);
};

export const coursePurchased = async ( data: any) => {
  // return await db.collection('coursePurchased').doc(data.id).set(data);
  const batch = db.batch();
  // await CoursePurchased(Jdata, userId, ret.Invoiceid, ret.id,ret.isPaid);
  const coursePurchasedRef = db.collection("coursePurchased").doc("id");
  data.Jdata.forEach((Item: { courseId: any; name: any; }) => {
    batch.set(coursePurchasedRef, {
      UID: data.id,
      courseId: Item.courseId,
      courseName: Item.name,
      invoiceId: data.Invoiceid,
      status: data.isPaid,
      transactionId: data.id,
    });
  });
  return await batch.commit();
};

export const courseMessage = async (userId: string, Jdata: any) => {
  const batch = db.batch();
  // await CoursePurchased(Jdata, userId, ret.Invoiceid, ret.id,ret.isPaid);
  const coursePurchasedRef = db.collection("teacherStudentMessaging").doc("id");
  let student: any;
  let teacher: any;
  const teacherInfo: string[] = [];
  student = await getUser(userId);
  Jdata.forEach(async (Item: { courseId: string; }) => {
    teacher = await getCourse(Item.courseId);
    const recTeacher: any = [];
    teacher.teacher.forEach((_Teacher: any) => {
      // tslint:disable-next-line:ban-comma-operator
      (recTeacher.email = _Teacher.teacherEmail),
        (recTeacher.id = _Teacher.id),
        (recTeacher.name = _Teacher.teacherName);
      teacherInfo.push(recTeacher);
    });

    batch.set(coursePurchasedRef, {
      courseId: Item.courseId,
      student: {
        email: student.email,
        id: student.UID,
        name: student.displayName,
      },
      teacher: {
        teacherInfo,
      },
    });
  });
  return await batch.commit();
};

export const getCoursePayment = async (id: any) => {
  return await db
    .collection("coursePayments")
    .doc(id)
    .get()
    .then((doc) => doc.data());
};
